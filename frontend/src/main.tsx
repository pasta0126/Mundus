import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The 3D pages pull in three.js; load them only when their route is visited
// so the map page's bundle stays as light as it was.
const PlanetsPage = lazy(() => import('./planets/PlanetsPage.tsx'))

function Root() {
  if (window.location.pathname.startsWith('/planets')) {
    return (
      <Suspense fallback={null}>
        <PlanetsPage />
      </Suspense>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
