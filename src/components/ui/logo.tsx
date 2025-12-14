import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export const Logo: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const handleClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  // Dark theme = use light logo (for contrast)
  // Light theme = use dark logo (for contrast)
  const logoSrc = theme === "dark" ? "/logo-light.png" : "/logo-dark.png";

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <img className="w-10 h-10" alt="Logo" src={logoSrc} />
      <span className="text-xl font-semibold text-gray-900 dark:text-white">
        SPARKFLUENCE
      </span>
    </button>
  );
};
