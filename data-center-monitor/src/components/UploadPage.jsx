// src/components/UploadPage.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaUpload } from "react-icons/fa";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState(""); // Tambahan

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      return setMsg("Pilih file .sql terlebih dahulu!");
    }

    setLoading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("sqlfile", file);
    formData.append("environment", environment); // Tambahan

    try {
      const res = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMsg("Upload berhasil!");
      } else {
        const text = await res.text();
        setMsg("❌ Upload gagal: " + text);
      }
    } catch (err) {
      setMsg("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center">
          <Link to="/" className="flex items-center hover:opacity-90">
            <FaArrowLeft className="mr-2 text-lg" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Upload File Database <span className="text-blue-600">.sql</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="sr-only">Choose your .sql file</span>
              <input
                type="file"
                accept=".sql"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-gray-700 file:mr-4 file:py-2 file:px-4
                           file:rounded file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100"
              />
            </label>

            {/* Environment */}
            <label className="block mb-2">
              <span className="text-gray-700">Environment Database</span>
              <select
                className="block w-full mt-1 p-2 border rounded"
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
                required
              >
                <option value="">Pilih Environment</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Obsolete">Obsolete</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg
                          text-white font-medium 
                          ${loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              <FaUpload />
              <span>{loading ? "Uploading..." : "Upload"}</span>
            </button>
          </form>

          {msg && (
            <p
              className={`mt-4 text-center text-sm ${
                msg.startsWith("🎉") ? "text-green-600" : "text-red-600"
              }`}
            >
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
