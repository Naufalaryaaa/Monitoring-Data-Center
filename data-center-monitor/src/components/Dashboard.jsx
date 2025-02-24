import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Registrasi plugin Chart.js
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("02");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [startDate, setStartDate] = useState("2025-02-01");
  const [endDate, setEndDate] = useState("2025-02-10");

  // Fungsi mengambil data dari API
  const fetchData = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/database-growth?start=${startDate}&end=${endDate}`
      );
      const result = await response.json();
      console.log("Data from API:", result);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Fungsi untuk memperbarui rentang tanggal berdasarkan bulan & tahun yang dipilih
  const updateDateRange = (month, year) => {
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  useEffect(() => {
    updateDateRange(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // Data yang akan ditampilkan dalam grafik
  const chartData = {
    labels: data.map((entry) => entry.date),
    datasets: [
      {
        label: "Pertumbuhan Database",
        data: data.map((entry) => entry.growth),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Tanggal" } },
      y: { title: { display: true, text: "Pertumbuhan" } },
    },
  };

  return (
    <div className="bg-blue-100 min-h-screen flex justify-center items-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center text-black-600 mb-6">
          Dashboard Monitoring Database
        </h1>

        {/* Filter Bulan & Tahun */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold">Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border p-2 rounded mt-1 bg-gray-100"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, "0");
                return (
                  <option key={month} value={month}>
                    {new Date(2025, i, 1).toLocaleString("id-ID", { month: "long" })}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold">Tahun:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border p-2 rounded mt-1 bg-gray-100"
            >
              {["2024", "2025", "2026"].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pilihan Tanggal */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-semibold">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border p-2 rounded mt-1 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border p-2 rounded mt-1 bg-gray-100"
            />
          </div>
        </div>

        {/* Grafik Pertumbuhan Database */}
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
          {data.length > 0 ? (
            <Line data={chartData} options={options} />
          ) : (
            <p className="text-center text-gray-600">
              Tunggu sebentar, data sedang dimuat atau tidak tersedia untuk periode ini...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
