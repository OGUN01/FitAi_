import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Input } from './Input';
import { THEME } from '../../utils/constants';

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  style?: any;
  inputStyle?: any;
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

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const EyeIcon = () => (
    <Text style={{
      fontSize: 18,
      color: THEME.colors.textSecondary,
    }}>
      {isVisible ? '👁️' : '🙈'}
    </Text>
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
      rightIcon={<EyeIcon />}
      onRightIconPress={toggleVisibility}
    />
  );
};