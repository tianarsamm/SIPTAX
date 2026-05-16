'use client'

import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, TrendingUp, ShoppingCart, Plus, History, FileBarChart2, FileBadge2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [manualPpnExpanded, setManualPpnExpanded] = useState<boolean | null>(null)
  const [manualPembelianExpanded, setManualPembelianExpanded] = useState<boolean | null>(null)

  const isPpnPath = pathname.startsWith('/dashboard/arsipppn') || pathname.startsWith('/dashboard/kontrolppn')
  const ppnExpanded = manualPpnExpanded !== null ? manualPpnExpanded : isPpnPath

  const isPembelianPath = pathname.startsWith('/dashboard/pembelian')
  const pembelianExpanded = manualPembelianExpanded !== null ? manualPembelianExpanded : isPembelianPath

  // PPN submenus
  const ppnSubItems = [
    { label: 'Arsip PPN', icon: FileBadge2, path: '/dashboard/arsipppn' },
    { label: 'Kontrol PPN', icon: FileBarChart2, path: '/dashboard/kontrolppn' },
  ]

  const pembelianSubItems = [
    { label: 'Input Pembelian', icon: Plus, path: '/dashboard/pembelian' },
    { label: 'Riwayat Pembelian', icon: History, path: '/dashboard/pembelian/riwayat' },
  ]

  const navItems = [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Transaksi',     icon: Building2,       path: '/dashboard/cekppn' },
    { label: 'Penjualan',     icon: TrendingUp,      path: '/dashboard/penjualan' },
    { label: 'Kontrol PPh',   icon: FileBarChart2,   path: '/dashboard/kontrolpph' },
  ]

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      document.documentElement.style.setProperty('--sidebar-w', next ? '64px' : '220px')
      return next
    })
  }

  return (
    <>
      <style>{`
        :root { --sidebar-w: 220px; }

        .sidebar {
          width: var(--sidebar-w);
          background: #fff;
          border-right: 1px solid #e8ecf0;
          padding: 1.5rem 0 0;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          transition: width 0.2s ease;
          overflow: hidden;
          z-index: 20;
        }
        .sidebar-logo {
          padding: 0 1.5rem 1.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          min-height: 48px;
          display: flex;
          align-items: center;
        }
        .sidebar-logo span { color: #3b82f6; }
        .logo-short { display: flex; align-items: center; justify-content: center; width: 100%; }
        .sidebar-nav { padding: 1rem 0; flex: 1; }
        
        /* Parent menu item */
        .nav-parent {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.15s;
          border-left: 3px solid transparent;
          white-space: nowrap;
          overflow: hidden;
        }
        .nav-parent:hover { background: #f8fafc; color: #3b82f6; }
        .nav-parent.active { background: #eff6ff; color: #3b82f6; border-left-color: #3b82f6; }
        .nav-parent-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .nav-expand-icon {
          transition: transform 0.2s;
        }
        .nav-expand-icon.expanded {
          transform: rotate(180deg);
        }

        /* Submenu items */
        .nav-subitems {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          border-left: 3px solid #e2e8f0;
          margin-left: 0.5rem;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .nav-subitem {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1.5rem 0.6rem 2.25rem;
          cursor: pointer;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.15s;
          white-space: nowrap;
          overflow: hidden;
        }
        .nav-subitem:hover { background: #e8ecf0; color: #3b82f6; }
        .nav-subitem.active { background: #dbeafe; color: #3b82f6; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.15s;
          border-left: 3px solid transparent;
          white-space: nowrap;
          overflow: hidden;
        }
        .nav-item:hover { background: #f8fafc; color: #3b82f6; }
        .nav-item.active { background: #eff6ff; color: #3b82f6; border-left-color: #3b82f6; }
        .nav-label {
          transition: opacity 0.15s;
          pointer-events: none;
        }
        .sidebar-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.8rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
        }
        .toggle-btn {
          position: absolute;
          bottom: 64px;
          right: -12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #e8ecf0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 21;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          transition: background 0.15s;
        }
        .toggle-btn:hover { background: #eff6ff; }
      `}</style>

      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          {collapsed
            ? <span className="logo-short" style={{ color: '#3b82f6' }}>S</span>
            : <><span>Sip</span>Tax</>
          }
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
            const Icon = item.icon
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span className="nav-label" style={{ opacity: collapsed ? 0 : 1 }}>
                  {item.label}
                </span>
              </div>
            )
          })}

          {collapsed && (
            <div
              className={`nav-item ${isPembelianPath ? 'active' : ''}`}
              onClick={() => router.push('/dashboard/pembelian')}
              title="Pembelian"
            >
              <ShoppingCart size={17} style={{ flexShrink: 0 }} />
              <span className="nav-label" style={{ opacity: 0 }}>
                Pembelian
              </span>
            </div>
          )}

          {/* Pembelian Parent Menu */}
          {!collapsed && (
            <div
              className={`nav-parent ${isPembelianPath ? 'active' : ''}`}
              onClick={() => setManualPembelianExpanded(!pembelianExpanded)}
            >
              <div className="nav-parent-left">
                <ShoppingCart size={17} style={{ flexShrink: 0 }} />
                <span className="nav-label">Pembelian</span>
              </div>
              {pembelianExpanded ? (
                <ChevronUp size={14} className="nav-expand-icon" />
              ) : (
                <ChevronDown size={14} className="nav-expand-icon" />
              )}
            </div>
          )}

          {/* Pembelian Submenus */}
          {pembelianExpanded && !collapsed && pembelianSubItems.map((subItem) => {
            const isActive = pathname === subItem.path
            const Icon = subItem.icon
            return (
              <div
                key={subItem.path}
                className={`nav-subitem ${isActive ? 'active' : ''}`}
                onClick={() => router.push(subItem.path)}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span>{subItem.label}</span>
              </div>
            )
          })}

          {/* PPN Parent Menu */}
          {!collapsed && (
            <div
              className={`nav-parent ${pathname.startsWith('/dashboard/arsipppn') || pathname.startsWith('/dashboard/kontrolppn') ? 'active' : ''}`}
              onClick={() => setManualPpnExpanded(!ppnExpanded)}
            >
              <div className="nav-parent-left">
                <FileBadge2 size={17} style={{ flexShrink: 0 }} />
                <span className="nav-label">PPN</span>
              </div>
              {ppnExpanded ? (
                <ChevronUp size={14} className="nav-expand-icon" />
              ) : (
                <ChevronDown size={14} className="nav-expand-icon" />
              )}
            </div>
          )}

          {/* PPN Submenus */}
          {ppnExpanded && !collapsed && ppnSubItems.map((subItem) => {
            const isActive = pathname === subItem.path
            const Icon = subItem.icon
            return (
              <div
                key={subItem.path}
                className={`nav-subitem ${isActive ? 'active' : ''}`}
                onClick={() => router.push(subItem.path)}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span>{subItem.label}</span>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          {collapsed ? '' : 'v1.0.0'}
        </div>

        {/* Toggle button */}
        <button className="toggle-btn" onClick={toggle}>
          {collapsed
            ? <ChevronRight size={13} color="#64748b" />
            : <ChevronLeft size={13} color="#64748b" />
          }
        </button>
      </aside>
    </>
  )
}
