import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HydraPopupWindow from './components/hydra/HydraPopupWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HydraPopupWindow />
  </StrictMode>
)
