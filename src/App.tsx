import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Add routes as you build features */}
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  )
}

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900">
        Presentation-Prep-Feedbacker
      </h1>
      <p className="mt-4 text-gray-600">
        AI-powered presentation feedback tool
      </p>
    </div>
  )
}

export default App
