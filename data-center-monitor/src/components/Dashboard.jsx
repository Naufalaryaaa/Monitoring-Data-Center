import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { FaSearch, FaBell } from "react-icons/fa";
import { BsCalendar } from "react-icons/bs";
import pindadLogo from "../assets/pindad.png"; // Pastikan lokasi file sesuai

// Komponen Chart + Filter
const ChartComponent = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState(data);

  useEffect(() => {
    // Copy array data
    let results = [...data];

    // Filter pencarian filename
    if (searchTerm.trim() !== "") {
      results = results.filter((item) =>
        item.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter rentang tanggal
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      results = results.filter((item) => {
        const itemDate = new Date(item.date); // data item.date format "YYYY-MM-DD"
        return itemDate >= start && itemDate <= end;
      });
    }

    // Sort data bedasarkan date (ascending)
    results.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Jika hanya 1 data point, gandakan supaya area chart menampilkan garis
    if (results.length === 1) {
      results.push({ ...results[0] });
    }

    setFilteredData(results);
  }, [data, searchTerm, startDate, endDate]);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      {/* Input Pencarian */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search Database"
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FaSearch className="absolute top-4 right-4 text-gray-500" />
      </div>

      {/* Filter Tanggal */}
      <div className="flex items-center justify-between mb-4 space-x-2">
        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
          <BsCalendar className="text-gray-500" />
          <input
            type="date"
            className="bg-transparent outline-none text-gray-700"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <span className="text-xl">→</span>
        <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg border border-gray-300">
          <BsCalendar className="text-gray-500" />
          <input
            type="date"
            className="bg-transparent outline-none text-gray-700"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Grafik Area */}
      <div className="w-full bg-gray-50 p-4 rounded-lg shadow-lg">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={filteredData}>
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="sizeKB"
              stroke="#2563eb"
              fill="#93c5fd"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Komponen utama Dashboard
const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/db-sizes")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        return res.json();
      })
      .then((jsonData) => {
        console.log("Data fetched:", jsonData);
        // Pastikan nama field di JSON adalah "sizeKB" (bukan "size_kb" kalau ternyata backend mengirim "sizeKB")
        // Lakukan parse agar benar-benar number
        const formattedData = jsonData.map((item) => {
          return {
            date: item.date, // "YYYY-MM-DD"
            sizeKB: Number(item.sizeKB), // Perhatikan case field di backend
            filename: item.filename
          };
        });
        setData(formattedData);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-blue-800 text-white p-4 rounded-lg shadow-lg mb-6">
        <div className="flex items-center space-x-3">
          <img src={pindadLogo} alt="pindadLogo" className="h-10" />
          <h1 className="text-3xl font-bold">Monitoring Data Center</h1>
        </div>
        <FaBell className="text-2xl cursor-pointer" />
      </div>

      {/* Grid empat ChartComponent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <ChartComponent key={i} data={data} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
