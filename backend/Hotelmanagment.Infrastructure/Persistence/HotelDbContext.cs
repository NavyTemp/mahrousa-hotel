using HotelManagement.Domain.Entities;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Infrastructure.Persistence
{
    public class HotelDbContext : DbContext
    {
        public HotelDbContext(DbContextOptions<HotelDbContext> options) : base(options) { }

        public DbSet<Staff> Staff => Set<Staff>();
        public DbSet<StaffRoleAssignment> StaffRoles => Set<StaffRoleAssignment>();
        public DbSet<Room> Rooms => Set<Room>();
        public DbSet<RoomFeature> RoomFeatures => Set<RoomFeature>();
        public DbSet<Hall> Halls => Set<Hall>();
        public DbSet<HallBooking> HallBookings => Set<HallBooking>();
        public DbSet<Guest> Guests => Set<Guest>();
        public DbSet<Reservation> Reservations => Set<Reservation>();
        public DbSet<GuestFolio> GuestFolios => Set<GuestFolio>();
        public DbSet<FolioLine> FolioLines => Set<FolioLine>();
        public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
        public DbSet<InventoryUsageLog> InventoryUsageLogs => Set<InventoryUsageLog>();
        public DbSet<InventoryRestockLog> InventoryRestockLogs => Set<InventoryRestockLog>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Staff>(entity =>
            {
                entity.HasKey(s => s.Id);

                entity.Property(s => s.Id)
                      .UseIdentityByDefaultColumn();

                entity.HasIndex(s => s.Username)
                      .IsUnique();

                entity.Property(s => s.FullName)
                      .IsRequired()
                      .HasMaxLength(100);

                entity.Property(s => s.Username)
                      .IsRequired()
                      .HasMaxLength(50);

                entity.Property(s => s.PasswordHash)
                      .IsRequired();
            });

            modelBuilder.Entity<StaffRoleAssignment>(entity =>
            {
                entity.HasKey(r => new { r.StaffId, r.Role });

                entity.Property(r => r.Role)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.HasOne(r => r.Staff)
                      .WithMany(s => s.Roles)
                      .HasForeignKey(r => r.StaffId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Room>(e =>
            {
                e.HasKey(r => r.Id);
                e.Property(r => r.Id).UseIdentityByDefaultColumn();
                e.HasIndex(r => r.RoomNumber).IsUnique();
                e.Property(r => r.RoomNumber).IsRequired().HasMaxLength(10);
                e.Property(r => r.Type).HasConversion<string>().HasMaxLength(20);
                e.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
                e.Property(r => r.PricePerNight).HasColumnType("numeric(10,2)");
            });

            modelBuilder.Entity<RoomFeature>(e =>
            {
                e.HasKey(f => f.Id);
                e.Property(f => f.Id).UseIdentityByDefaultColumn();
                e.Property(f => f.Type).HasConversion<string>().HasMaxLength(30);
                e.Property(f => f.Notes).HasMaxLength(200);

                e.HasOne(f => f.Room)
                 .WithMany(r => r.Features)
                 .HasForeignKey(f => f.RoomId)
                 .OnDelete(DeleteBehavior.Cascade);

                // One row per (room, feature type): bump Quantity instead of
                // inserting a duplicate. Enforced both in the service and here.
                e.HasIndex(f => new { f.RoomId, f.Type }).IsUnique();
            });

            modelBuilder.Entity<Hall>(e =>
            {
                e.HasKey(h => h.Id);
                e.Property(h => h.Id).UseIdentityByDefaultColumn();
                e.HasIndex(h => h.Name).IsUnique();
                e.Property(h => h.Name).IsRequired().HasMaxLength(100);
                e.Property(h => h.Status).HasConversion<string>().HasMaxLength(20);
                e.Property(h => h.HourlyRate).HasColumnType("numeric(10,2)");
            });

            modelBuilder.Entity<HallBooking>(e =>
            {
                e.HasKey(b => b.Id);
                e.Property(b => b.Id).UseIdentityByDefaultColumn();
                e.Property(b => b.CustomerName).IsRequired().HasMaxLength(100);
                e.Property(b => b.CustomerPhone).IsRequired().HasMaxLength(20);
                e.Property(b => b.Purpose).HasMaxLength(200);
                e.Property(b => b.TotalPrice).HasColumnType("numeric(10,2)");
                e.Property(b => b.Status).HasConversion<string>().HasMaxLength(20);

                e.HasOne(b => b.Hall)
                 .WithMany(h => h.Bookings)
                 .HasForeignKey(b => b.HallId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(b => new { b.HallId, b.StartTime });
            });

            modelBuilder.Entity<Guest>(e =>
            {
                e.HasKey(g => g.Id);
                e.Property(g => g.Id).UseIdentityByDefaultColumn();
                e.Property(g => g.FullName).IsRequired().HasMaxLength(100);
                e.Property(g => g.Phone).IsRequired().HasMaxLength(20);
                e.Property(g => g.NationalId).HasMaxLength(50);
            });

            modelBuilder.Entity<Reservation>(e =>
            {
                e.HasKey(r => r.Id);
                e.Property(r => r.Id).UseIdentityByDefaultColumn();
                e.Property(r => r.Source).HasConversion<string>().HasMaxLength(20);
                e.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);

                e.HasOne(r => r.Guest)
                 .WithMany(g => g.Reservations)
                 .HasForeignKey(r => r.GuestId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(r => r.Room)
                 .WithMany(room => room.Reservations)
                 .HasForeignKey(r => r.RoomId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<GuestFolio>(e =>
            {
                e.HasKey(f => f.Id);
                e.Property(f => f.Id).UseIdentityByDefaultColumn();
                e.Ignore(f => f.Total);

                e.Property(f => f.PaymentProofPath)
                 .HasMaxLength(500);

                e.HasOne(f => f.Reservation)
                 .WithMany()
                 .HasForeignKey(f => f.ReservationId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FolioLine>(e =>
            {
                e.HasKey(l => l.Id);
                e.Property(l => l.Id).UseIdentityByDefaultColumn();
                e.Property(l => l.Amount).HasColumnType("numeric(10,2)");
                e.Property(l => l.Description).IsRequired().HasMaxLength(200);
                e.Property(l => l.LineType).HasConversion<string>().HasMaxLength(30);

                e.HasOne(l => l.Folio)
                 .WithMany(f => f.Lines)
                 .HasForeignKey(l => l.FolioId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<InventoryItem>(e =>
            {
                e.HasKey(i => i.Id);
                e.Property(i => i.Id).UseIdentityByDefaultColumn();
                e.Property(i => i.Name).IsRequired().HasMaxLength(100);
                e.Property(i => i.Category).HasConversion<string>().HasMaxLength(30);
            });

            modelBuilder.Entity<InventoryUsageLog>(e =>
            {
                e.HasKey(l => l.Id);
                e.Property(l => l.Id).UseIdentityByDefaultColumn();

                e.HasOne(l => l.Item)
                 .WithMany(i => i.UsageLogs)
                 .HasForeignKey(l => l.ItemId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(l => l.Room)
                 .WithMany()
                 .HasForeignKey(l => l.RoomId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(l => l.Staff)
                 .WithMany()
                 .HasForeignKey(l => l.StaffId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<InventoryRestockLog>(e =>
            {
                e.HasKey(l => l.Id);
                e.Property(l => l.Id).UseIdentityByDefaultColumn();

                e.HasOne(l => l.Item)
                 .WithMany(i => i.RestockLogs)
                 .HasForeignKey(l => l.ItemId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(l => l.Staff)
                 .WithMany()
                 .HasForeignKey(l => l.StaffId)
                 .OnDelete(DeleteBehavior.Restrict);
            });
        }

    }
}

