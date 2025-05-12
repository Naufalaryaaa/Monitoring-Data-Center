import { useState, useEffect } from "react";
import Notifications from "./Notifications"; 
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { FaSearch } from "react-icons/fa";
import { BsCalendar } from "react-icons/bs";
import { Link } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import pindadLogo from "../assets/pindad.png";

const ChartComponent = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState(data);
  const [suggestions, setSuggestions] = useState([]); // To hold search suggestions

  useEffect(() => {
    // Mulai dengan data original
    let results = [...data];

    // Filter berdasarkan rentang tanggal
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      results = results.filter((item) => {
        const itemDate = new Date(item.date); 
        return itemDate >= start && itemDate <= end;
      });
    }

    // Sort data berdasarkan date (ascending)
    results.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Jika hanya 1 data point, gandakan supaya area chart menampilkan garis
    if (results.length === 1) {
      results.push({ ...results[0] });
    }

    setFilteredData(results);
  }, [data, startDate, endDate]);

  const handleSearch = () => {
    let results = [...data];

    if (searchTerm.trim() !== "") {
      results = results.filter((item) =>
        item.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(results);
  };

  const handleChangeSearchTerm = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    // Generate search suggestions based on current input
    const filteredSuggestions = data.filter((item) =>
      item.filename.toLowerCase().includes(term.toLowerCase())
    );
    setSuggestions(filteredSuggestions);
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search Database"
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
          value={searchTerm}
          onChange={handleChangeSearchTerm}
        />
        <FaSearch
          className="absolute top-4 right-4 text-gray-500 cursor-pointer"
          onClick={handleSearch} // Trigger search when clicked
        />
        {/* Displaying suggestions */}
        {suggestions.length > 0 && (
          <ul className="absolute bg-white w-full border border-gray-300 max-h-60 overflow-y-auto z-10">
            {suggestions.map((item, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => {
                  setSearchTerm(item.filename);
                  setSuggestions([]); // Clear suggestions
                  handleSearch(); // Perform the search
                }}
              >
                {item.filename}
              </li>
            ))}
          </ul>
        )}
      </div>

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

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/db-sizes")
      .then((res) => res.json())
      .then((jsonData) => {
        const formattedData = jsonData.map((item) => ({
          date: item.date,
          sizeKB: Number(item.size_kb),
          filename: item.filename,
        }));
        setData(formattedData);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
    {/* Header */}
    <div className="flex justify-between items-center bg-blue-800 text-white p-4 rounded-lg shadow-lg mb-6">
      <div className="flex items-center space-x-3">
        <img src={pindadLogo} alt="Pindad Logo" className="h-10" />
        <h1 className="text-3xl font-bold">Monitoring Data Center</h1>
      </div>
      <div className="flex items-center space-x-4">
        <Link to="/upload" title="Upload SQL file" className="hover:text-gray-200">
          <FaUpload className="text-2xl" />
        </Link>
        <Notifications />
      </div>
    </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <ChartComponent key={i} data={data} />
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
