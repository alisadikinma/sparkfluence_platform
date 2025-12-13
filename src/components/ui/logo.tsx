import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const Logo: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <img className="w-10 h-10" alt="Logo" src="/logo.png" />
      <span className="text-xl font-semibold text-white">SPARKFLUENCE</span>
    </button>
  );
};
