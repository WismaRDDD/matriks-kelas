'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState(null);

  const navItems = [
    { id: 'dosen', label: '👨‍🏫 Dosen', href: '/dashboard/dosen' },
    { id: 'kurikulum', label: '📖 Kurikulum', href: '/dashboard/kurikulum' },
    { id: 'ruangan', label: '🏢 Ruangan', href: '/dashboard/ruangan' },
    { id: 'kelas', label: '📚 KRS Matakuliah', href: '/dashboard/kelas' },
    { id: 'jadwal', label: '📅 Jadwal', href: '/dashboard/jadwal' },
  ];

  return (
    <div style={styles.container}>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.welcomeContainer}>
          <h2 style={styles.welcomeTitle}>👋 Selamat datang di Matriks Kelas</h2>
          <p style={styles.welcomeSubtitle}>
            Silakan pilih menu di bawah untuk memulai
          </p>
          <div style={styles.welcomeGrid}>
            {navItems.map(item => (
              <Link key={item.id} href={item.href}>
                <div
                  style={styles.welcomeCard}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div style={styles.welcomeCardIcon}>{item.label.split(' ')[0]}</div>
                  <h3 style={styles.welcomeCardTitle}>{item.label.split(' ')[1]}</h3>
                  <p style={styles.welcomeCardDesc}>
                    Kelola data {item.label.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {

  // ── Page shell ────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    background: '#f4f6fb',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  },

  // ── Top gradient header banner ────────────────────────────
  header: {
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    padding: '1.5rem 2rem',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
  },

  title: {
    margin: 0,
    fontSize: '1.6rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
    color: '#ffffff',
  },

  // Optional breadcrumb text inside header
  headerBreadcrumb: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.72)',
    margin: 0,
  },

  // ── Sticky nav bar (tab row) ──────────────────────────────
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e8eaf6',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },

  navContent: {
    display: 'flex',
    gap: '0.25rem',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowX: 'auto',
  },

  // Inactive tab
  navItem: {
    background: 'none',
    border: 'none',
    padding: '1rem 1.1rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#607d8b',
    cursor: 'pointer',
    transition: 'color 0.2s',
    position: 'relative',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
  },

  // Active tab
  navItemActive: {
    color: '#7b1fa2',
    fontWeight: '700',
  },

  // Active underline indicator
  navUnderline: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '3px',
    background: 'linear-gradient(90deg, #c2185b, #7b1fa2)',
    borderRadius: '3px 3px 0 0',
  },

  // ── Main content area ─────────────────────────────────────
  content: {
    padding: '2.5rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  // ── Welcome / dashboard section ───────────────────────────

  // Gradient hero area (sits inside content, above the cards)
  welcomeContainer: {
    background: 'linear-gradient(135deg, #c2185b 0%, #7b1fa2 60%, #4527a0 100%)',
    borderRadius: '14px',
    padding: '2.5rem 2rem',
    textAlign: 'center',
    color: 'white',
    marginBottom: '2.5rem',
    boxShadow: '0 8px 32px rgba(123,31,162,0.25)',
  },

  welcomeTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    letterSpacing: '0.02em',
  },

  welcomeSubtitle: {
    fontSize: '1rem',
    opacity: 0.88,
    margin: '0 0 2.5rem 0',
    fontWeight: '400',
  },

  // ── Dashboard card grid ───────────────────────────────────
  welcomeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginTop: '0',
  },

  // Each feature card — white with coloured left accent
  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.75rem 1.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'transform 0.18s, box-shadow 0.18s',
    cursor: 'pointer',
    borderTop: '4px solid transparent',
    // Individual cards can override borderTop colour in JSX:
    // style={{ ...styles.welcomeCard, borderTop: '4px solid #c2185b' }}
  },

  // Hovered state — apply via onMouseEnter/Leave in JSX:
  // onMouseEnter: e => e.currentTarget.style.transform = 'translateY(-4px)'
  // onMouseLeave: e => e.currentTarget.style.transform = 'translateY(0)'

  welcomeCardIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    display: 'block',
  },

  welcomeCardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#37474f',
    margin: '0 0 0.4rem 0',
  },

  welcomeCardDesc: {
    fontSize: '0.875rem',
    color: '#90a4ae',
    margin: 0,
    lineHeight: '1.5',
  },

  // ── Card accent colours (use as borderTop overrides) ──────
  // Apply like: style={{ ...styles.welcomeCard, ...styles.accentPink }}
  accentPink:   { borderTop: '4px solid #c2185b' },
  accentPurple: { borderTop: '4px solid #7b1fa2' },
  accentIndigo: { borderTop: '4px solid #4527a0' },
  accentTeal:   { borderTop: '4px solid #00897b' },
  accentBlue:   { borderTop: '4px solid #1e88e5' },
  accentAmber:  { borderTop: '4px solid #f57f17' },
};

export default styles;