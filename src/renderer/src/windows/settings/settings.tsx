import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsWindow from './SettingsWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsWindow />
  </StrictMode>
)
