import { useState, useCallback, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileMenuContext } from '../../contexts/MobileMenuContext'
import { cn } from '../../lib/utils'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('lt_sidebar_collapsed') === 'true',
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggle = () => {
    setCollapsed((v) => {
      localStorage.setItem('lt_sidebar_collapsed', String(!v))
      return !v
    })
  }

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const menuCtx = useMemo(() => ({ openMobileMenu: openMobile }), [openMobile])

  return (
    <MobileMenuContext.Provider value={menuCtx}>
      <div className="flex min-h-screen bg-slate-50">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
        )}

        <Sidebar
          collapsed={collapsed}
          onToggle={toggle}
          mobileOpen={mobileOpen}
          onMobileClose={closeMobile}
        />

        <div
          className={cn(
            'flex flex-1 flex-col transition-[padding-left] duration-300 ease-in-out',
            'pl-0 lg:pl-64',
            collapsed && 'lg:pl-20',
          )}
        >
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </MobileMenuContext.Provider>
  )
}
