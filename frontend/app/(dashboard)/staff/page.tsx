"use client";

import { useEffect, useState, FormEvent } from "react";
import { staffApi } from "@/lib/api";
import { ALL_STAFF_ROLES } from "@/types";
import type { Staff, StaffRole } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { GoldButton, Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import {
  Users, UserPlus, Check, X,
  Power, Pencil,
} from "lucide-react";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin:       { bg: "#dfe9ec", color: "#155160" },
  Reception:   { bg: "#d8e8f5", color: "#154e87" },
  Cashier:     { bg: "#e2efd1", color: "#2f5d0f" },
  RoomService: { bg: "#dfe9ec", color: "#0e3a44" },
  Restaurant:  { bg: "#e4e3f7", color: "#383078" },
};

const ROLE_BADGE: Record<string, string> = {
  Admin:       "badge amber",
  Reception:   "badge blue",
  Cashier:     "badge green",
  RoomService: "badge amber",
  Restaurant:  "badge purple",
};

const EMPTY_FORM: {
  fullName: string;
  username: string;
  password: string;
  roles: StaffRole[];
} = { fullName: "", username: "", password: "", roles: [] };

export default function StaffPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { t } = useI18n();

  const [staff,   setStaff]   = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Create form
  const [showForm, setShowForm]   = useState(false);
  const [form,     setForm]       = useState(EMPTY_FORM);
  const [formErrs, setFormErrs]   = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [creating, setCreating]   = useState(false);

  // Inline edit
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editRoles,   setEditRoles]   = useState<StaffRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [togglingId,  setTogglingId]  = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setStaff(await staffApi.getAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed to load staff."));
    } finally {
      setLoading(false);
    }
  }

  function toggleFormRole(role: StaffRole) {
    setForm(p => ({
      ...p,
      roles: p.roles.includes(role)
        ? p.roles.filter(r => r !== role)
        : [...p.roles, role],
    }));
    setFormErrs(p => ({ ...p, roles: "" }));
  }

  function validateForm() {
    const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.fullName.trim())              e.fullName = t("Full name is required.");
    if (!form.username.trim())              e.username = t("Username is required.");
    if (form.password.length < 6)           e.password = t("At least 6 characters.");
    if (form.roles.length === 0)            e.roles    = t("Pick at least one role.");
    return e;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrs(errs); return; }

    setCreating(true);
    try {
      const created = await staffApi.create({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        password: form.password,
        roles:    form.roles,
      });
      setStaff(p => [...p, created]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(t("{name} added.", { name: created.fullName }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to add staff."));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(s: Staff) {
    setEditingId(s.id);
    setEditRoles([...s.roles]);
  }

  function toggleEditRole(role: StaffRole) {
    setEditRoles(p =>
      p.includes(role) ? p.filter(r => r !== role) : [...p, role]
    );
  }

  async function saveRoles(s: Staff) {
    if (editRoles.length === 0) {
      toast.error(t("At least one role is required."));
      return;
    }
    setSavingRoles(true);
    try {
      const updated = await staffApi.updateRoles(s.id, editRoles);
      setStaff(p => p.map(x => x.id === s.id ? updated : x));
      setEditingId(null);
      toast.success(t("Roles updated for {name}.", { name: updated.fullName }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to update roles."));
    } finally {
      setSavingRoles(false);
    }
  }

  async function toggleActive(s: Staff) {
    // Prevent admin from disabling their own account.
    if (user && s.id === user.staffId) {
      toast.error(t("You cannot disable your own account."));
      return;
    }
    setTogglingId(s.id);
    try {
      const updated = await staffApi.setActive(s.id, !s.isActive);
      setStaff(p => p.map(x => x.id === s.id ? updated : x));
      toast.success(
        updated.isActive
          ? t("{name} enabled.", { name: updated.fullName })
          : t("{name} disabled.", { name: updated.fullName })
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to update status."));
    } finally {
      setTogglingId(null);
    }
  }

  const active = staff.filter(s => s.isActive).length;
  const byRole = staff.reduce<Record<string, number>>((acc, s) => {
    s.roles.forEach(r => { acc[r] = (acc[r] ?? 0) + 1; });
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title={t("Staff")}
        subtitle={active !== 1
          ? t("{n} active members", { n: active })
          : t("{n} active member", { n: active })}
        action={
          <GoldButton
            size="sm"
            icon={<UserPlus size={14} />}
            onClick={() => setShowForm(p => !p)}
          >
            {showForm ? t("Cancel") : t("Add staff")}
          </GoldButton>
        }
      />

      {/* Add staff form */}
      {showForm && (
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px", overflow: "hidden", marginBottom: "18px",
        }}>
          <CardHeader
            title={t("New staff account")}
            subtitle={t("Pick one or more roles — admin can mix them")}
            icon={<UserPlus size={14} />}
          />
          <div style={{ padding: "18px" }}>
            <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Input
                label={t("Full name")}
                placeholder={t("e.g. Hana Manager")}
                value={form.fullName}
                error={formErrs.fullName}
                onChange={e => { setForm(p => ({ ...p, fullName: e.target.value })); setFormErrs(p => ({ ...p, fullName: "" })); }}
              />
              <Input
                label={t("Username")}
                placeholder={t("e.g. hanam")}
                value={form.username}
                error={formErrs.username}
                onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setFormErrs(p => ({ ...p, username: "" })); }}
              />
              <Input
                label={t("Password")}
                type="password"
                placeholder={t("At least 6 characters")}
                value={form.password}
                error={formErrs.password}
                onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFormErrs(p => ({ ...p, password: "" })); }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{
                  fontSize: "10px", fontWeight: 600, color: "#1f6675",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {t("Roles")}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {ALL_STAFF_ROLES.map(role => {
                    const on = form.roles.includes(role);
                    const c  = ROLE_COLORS[role];
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleFormRole(role)}
                        style={{
                          padding: "6px 11px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: 500,
                          cursor: "pointer",
                          background: on ? c.bg : "#fff",
                          color:      on ? c.color : "#465766",
                          border:     on ? `1px solid ${c.color}33` : "0.5px solid rgba(0,0,0,0.15)",
                          transition: "all 0.12s",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {on && <Check size={11} />}
                        {t(role)}
                      </button>
                    );
                  })}
                </div>
                {formErrs.roles && (
                  <p style={{ fontSize: "11px", color: "#c9423f" }}>{formErrs.roles}</p>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormErrs({}); }}>
                  {t("Cancel")}
                </Button>
                <GoldButton type="submit" loading={creating}>
                  {t("Create staff")}
                </GoldButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role breakdown strip */}
      {!loading && staff.length > 0 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          {Object.entries(byRole).map(([role, count]) => {
            const c = ROLE_COLORS[role] ?? { bg: "#ece4cf", color: "#465766" };
            return (
              <div key={role} style={{
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
                borderRadius: "10px", padding: "10px 14px",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: c.bg, color: c.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: 700,
                }}>
                  {role.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#6f7c89" }}>{t(role)}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0e2638" }}>{count}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="table-wrap">
        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#8e2424" }}>{error}</div>
        )}

        {!loading && !error && staff.length === 0 && (
          <EmptyState
            icon={<Users size={28} />}
            title={t("No staff found")}
          />
        )}

        {!loading && !error && staff.length > 0 && (
          <table>
            <thead>
              <tr>
                {[t("Staff member"), t("Username"), t("Roles"), t("Status"), ""].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const c = ROLE_COLORS[s.roles[0]] ?? { bg: "#ece4cf", color: "#465766" };
                const isEditing = editingId === s.id;
                const isMe = user?.staffId === s.id;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "50%",
                          background: c.bg, color: c.color,
                          fontSize: "10px", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {initials(s.fullName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "12px" }}>
                            {s.fullName}
                            {isMe && (
                              <span style={{
                                marginLeft: "6px", fontSize: "9px", fontWeight: 600,
                                color: "#1f6675", textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}>
                                {t("you")}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6f7c89" }}>{t("ID #{n}", { n: s.id })}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{
                        background: "#ece4cf", padding: "2px 7px",
                        borderRadius: "5px", fontSize: "11px",
                      }}>
                        {s.username}
                      </code>
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "320px" }}>
                          {ALL_STAFF_ROLES.map(role => {
                            const on = editRoles.includes(role);
                            const rc = ROLE_COLORS[role];
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleEditRole(role)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "10px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  background: on ? rc.bg : "#fff",
                                  color:      on ? rc.color : "#6f7c89",
                                  border:     on ? `1px solid ${rc.color}33` : "0.5px solid rgba(0,0,0,0.15)",
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  transition: "all 0.12s",
                                }}
                              >
                                {on && <Check size={10} />}
                                {t(role)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {s.roles.map(r => (
                            <span key={r} className={ROLE_BADGE[r] ?? "badge gray"}>
                              {t(r)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge
                        label={s.isActive ? t("Active") : t("Inactive")}
                        variant={s.isActive ? "active" : "inactive"}
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {isEditing ? (
                          <>
                            <Button
                              size="sm" variant="secondary"
                              icon={<X size={12} />}
                              onClick={() => setEditingId(null)}
                              disabled={savingRoles}
                            >
                              {t("Cancel")}
                            </Button>
                            <Button
                              size="sm" variant="primary"
                              icon={<Check size={12} />}
                              loading={savingRoles}
                              onClick={() => saveRoles(s)}
                            >
                              {t("Save")}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm" variant="ghost"
                              icon={<Pencil size={12} />}
                              onClick={() => startEdit(s)}
                            >
                              {t("Roles")}
                            </Button>
                            <Button
                              size="sm"
                              variant={s.isActive ? "danger" : "secondary"}
                              icon={<Power size={12} />}
                              loading={togglingId === s.id}
                              disabled={isMe}
                              onClick={() => toggleActive(s)}
                            >
                              {s.isActive ? t("Disable") : t("Enable")}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
