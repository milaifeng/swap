import "./App.css";
import Header from "./components/Header";
import Swap from "./components/Swap";
import Token from "./components/Tokens";
import { Route, Routes } from "react-router-dom";
function App() {
  return (
    <div className="App">
      <Header />
      <div className="mainWindow">
        <Routes>
          <Route path="/" element={<Swap />} />
          <Route path="/tokens" element={<Token />}></Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
