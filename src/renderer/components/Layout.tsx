import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
