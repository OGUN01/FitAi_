import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFormValidation } from '../../utils/integration';

/**
 * Example authentication screen showing how to integrate login/register with backend
 * This demonstrates the complete authentication flow
 */

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthenticationExample: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, resetPassword, error, clearError } = useAuth();
  const { validateEmail, validatePassword } = useFormValidation();

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    // Clear previous errors
    clearError();

    // Validate inputs
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Missing Password', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ email, password });

      if (result.success) {
        // Navigation will be handled by AuthWrapper
        Alert.alert('Success', 'Welcome back to FitAI!');
      } else {
        Alert.alert('Login Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle registration submission
   */
  const handleRegister = async () => {
    // Clear previous errors
    clearError();

    // Validate inputs
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('Invalid Password', passwordValidation.errors.join('\n'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ email, password, confirmPassword });

      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before logging in.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle forgot password submission
   */
  const handleForgotPassword = async () => {
    // Clear previous errors
    clearError();

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(email);

      if (result.success) {
        Alert.alert(
          'Reset Email Sent',
          'Please check your email for password reset instructions.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      } else {
        Alert.alert('Reset Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form submission based on current mode
   */
  const handleSubmit = () => {
    switch (mode) {
      case 'login':
        handleLogin();
        break;
      case 'register':
        handleRegister();
        break;
      case 'forgot':
        handleForgotPassword();
        break;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FitAI</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' && 'Welcome back! Sign in to continue your fitness journey.'}
            {mode === 'register' && 'Join FitAI and start your personalized fitness journey.'}
            {mode === 'forgot' && 'Enter your email to reset your password.'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#8e9aaf"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input (not shown for forgot password) */}
          {mode !== 'forgot' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#8e9aaf"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Confirm Password Input (only for register) */}
          {mode === 'register' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#8e9aaf"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' && 'Sign In'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Email'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mode Switching */}
        <View style={styles.footer}>
          {mode === 'login' && (
            <>
              <TouchableOpacity onPress={() => setMode('register')}>
                <Text style={styles.linkText}>
                  Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotLink}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'register' && (
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}

          {mode === 'forgot' && (
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.linkText}>
                Remember your password? <Text style={styles.linkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Integration Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>🔧 Integration Notes</Text>
          <Text style={styles.instructionsText}>
            This example shows complete authentication integration with:
          </Text>
          <Text style={styles.instructionsText}>• Real backend authentication</Text>
          <Text style={styles.instructionsText}>• Form validation</Text>
          <Text style={styles.instructionsText}>• Error handling</Text>
          <Text style={styles.instructionsText}>• Loading states</Text>
          <Text style={styles.instructionsText}>• Email verification flow</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center' as const,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: '#ff6b35',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e9aaf',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  input: {
    backgroundColor: '#1a1f2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2f3e',
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  submitButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  footer: {
    alignItems: 'center' as const,
  },
  linkText: {
    color: '#8e9aaf',
    fontSize: 16,
    textAlign: 'center' as const,
  },
  linkTextBold: {
    color: '#ff6b35',
    fontWeight: 'bold' as const,
  },
  forgotLink: {
    marginTop: 16,
  },
  instructions: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#1a1f2e',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#ff6b35',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#8e9aaf',
    marginBottom: 2,
  },
};

export default AuthenticationExample;
