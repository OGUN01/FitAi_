import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../utils/constants';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Suppress Metro symbolication errors from console
    if (
      error.message?.includes('unknown') ||
      error.stack?.includes('getCodeFrame') ||
      error.stack?.includes('symbolicate') ||
      error.message?.includes('ENOENT')
    ) {
      // Silently ignore Metro symbolication errors
      return;
    }

    // TODO: Replace with proper error reporting service
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      console.log('Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error?.stack}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  errorContainer: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    maxWidth: '90%',
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.error,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  buttonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },
  debugContainer: {
    marginTop: THEME.spacing.lg,
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.sm,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  debugText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    fontFamily: 'monospace',
  },
});
