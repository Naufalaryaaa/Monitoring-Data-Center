import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FaSearch, FaBell } from "react-icons/fa";
import { BsCalendar } from "react-icons/bs";
import pindadLogo from "../assets/pindad.png";

const ChartComponent = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(data);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let results = data.filter((item) =>
      item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      results = results.filter((item) => {
        const itemDate = new Date(item.name);
        return itemDate >= start && itemDate <= end;
      });
    }

    setFilteredData(results);
  }, [searchTerm, startDate, endDate, data]);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      {/* Search Input */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search Database"
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FaSearch className="absolute top-4 right-4 text-gray-500" />
      </div>

      {/* Date Filters */}
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

      {/* Chart */}
      <div className="w-full bg-gray-50 p-4 rounded-lg shadow-lg">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={filteredData}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip />
            <Area type="monotone" dataKey="sizeKB" stroke="#2563eb" fill="#93c5fd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/file-size")
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((item) => ({
          name: item.date,
          sizeKB: item.sizeKB,
          filename: item.filename,
        }));
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <ChartComponent key={index} data={data} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
