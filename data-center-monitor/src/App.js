// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import UploadPage from "./components/UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman utama dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Halaman untuk upload file .sql */}
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
