import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { cn } from '../../lib/utils'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('lt_sidebar_collapsed') === 'true',
  )

  const toggle = () => {
    setCollapsed((v) => {
      localStorage.setItem('lt_sidebar_collapsed', String(!v))
      return !v
    })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className={cn(
          'flex flex-1 flex-col transition-[padding-left] duration-300 ease-in-out',
          collapsed ? 'pl-20' : 'pl-64',
        )}
      >
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
