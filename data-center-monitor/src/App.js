// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import UploadPage from "./components/UploadPage";
import "./App.css";

function App() {
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

export default App;
