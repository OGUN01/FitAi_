import React, { useState, useCallback } from "react";
import { ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "./Input";
import { ResponsiveTheme } from "../../utils/constants";

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  style,
  inputStyle,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const eyeIcon = (
    <Ionicons
      name={isVisible ? "eye-off-outline" : "eye-outline"}
      size={20}
      color={ResponsiveTheme.colors.textSecondary}
    />
  );

  return (
    <Input
      label={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      error={error}
      disabled={disabled}
      secureTextEntry={!isVisible}
      style={style}
      inputStyle={inputStyle}
      rightIcon={eyeIcon}
      onRightIconPress={toggleVisibility}
    />
  );
};
