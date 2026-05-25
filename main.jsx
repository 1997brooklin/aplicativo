import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Dados salvos em localStorage (persiste offline no próprio celular)
window.storage = {
  get: (key) => {
    const val = localStorage.getItem(key)
    return val ? { value: val } : null
  },
  set: (key, value) => {
    localStorage.setItem(key, value)
    return { value }
  },
  delete: (key) => {
    localStorage.removeItem(key)
    return { deleted: true }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
