'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState(null);

  const navItems = [
    { id: 'dosen', label: '👨‍🏫 Dosen', href: '/dashboard/dosen' },
    { id: 'ruangan', label: '🏛️ Ruangan', href: '/dashboard/ruangan' },
    { id: 'kurikulum', label: '📖 Kurikulum', href: '/dashboard/kurikulum' },
    { id: 'kelas', label: '📚 Kelas', href: '/dashboard/kelas' },
    { id: 'jadwal', label: '📅 Jadwal', href: '/dashboard/jadwal' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Matriks Kelas</h1>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          {navItems.map(item => (
            <Link key={item.id} href={item.href}>
              <button
                style={{
                  ...styles.navItem,
                  ...(activeTab === item.id ? styles.navItemActive : {}),
                }}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
                {activeTab === item.id && <div style={styles.navUnderline}></div>}
              </button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.welcomeContainer}>
          <h2 style={styles.welcomeTitle}>👋 Selamat datang di Matriks Kelas</h2>
          <p style={styles.welcomeSubtitle}>
            Silakan pilih menu di atas untuk memulai
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
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    padding: '2rem',
    color: 'white',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '700',
  },
  nav: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottom: '2px solid #e2e8f0',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    display: 'flex',
    gap: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '1rem 0.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'color 0.2s',
    position: 'relative',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  navUnderline: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '3px',
    backgroundColor: '#667eea',
    borderRadius: '3px 3px 0 0',
  },
  content: {
    padding: '3rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  welcomeContainer: {
    textAlign: 'center',
    color: 'white',
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem 0',
  },
  welcomeSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '3rem',
    margin: '0 0 3rem 0',
  },
  welcomeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginTop: '2rem',
  },
  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  welcomeCardIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  welcomeCardTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 0.5rem 0',
  },
  welcomeCardDesc: {
    fontSize: '0.95rem',
    color: '#a0aec0',
    margin: 0,
  },
};