import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Every page but the hub is loaded only when its route is visited: the hub
// makes no request and ships no map or 3D code, and the 3D pages pull in
// three.js.
const HomePage = lazy(() => import('./home/HomePage.tsx'))
const MapPage = lazy(() => import('./App.tsx'))
const DungeonsPage = lazy(() => import('./dungeons/DungeonsPage.tsx'))
const PlanetsPage = lazy(() => import('./planets/PlanetsPage.tsx'))
const SystemsPage = lazy(() => import('./planets/SystemsPage.tsx'))

function Page() {
  const path = window.location.pathname
  if (path.startsWith('/maps')) return <MapPage />
  if (path.startsWith('/dungeons')) return <DungeonsPage />
  if (path.startsWith('/planets')) return <PlanetsPage />
  if (path.startsWith('/systems')) return <SystemsPage />
  // The root, and any unknown path, gets the hub - never a heavy page.
  return <HomePage />
}

function Root() {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
