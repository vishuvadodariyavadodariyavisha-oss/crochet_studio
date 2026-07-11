import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { AuthProvider } from "./context/authContext"; // ✅ Import Provider
import { CartProvider } from "./context/cartContext";

function App() {
  return (
    <AuthProvider>  
       <CartProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;