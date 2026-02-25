import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Article from './pages/Article'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/article/:slug" element={<Article />} />
      </Routes>
    </BrowserRouter>
  )
}
