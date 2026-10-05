import { describe, it, expect } from 'vitest';
import { AuthService } from '../src/services/auth.service';

describe('Authentication Subsystem Integration', () => {
  const testEmail = `user_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword@123';

  it('registers a new user successfully and prevents duplicate registration', async () => {
    const regResult = await AuthService.register({
      name: 'Test Tester',
      email: testEmail,
      password: testPassword,
    });

    expect(regResult.userId).toBeDefined();
    expect(regResult.verificationToken).toBeDefined();

    // Verify duplicate registration error
    await expect(
      AuthService.register({
        name: 'Another User',
        email: testEmail,
        password: testPassword,
      })
    ).rejects.toThrow('already exists');
  });

  it('authenticates user with valid credentials and rejects wrong passwords', async () => {
    const loginResult = await AuthService.login({
      email: testEmail,
      password: testPassword,
    });

    expect(loginResult.user.email).toBe(testEmail);
    expect(loginResult.sessionToken).toBeDefined();
    expect(loginResult.jwtToken).toBeDefined();

    // Verify session in database
    const sessionCheck = await AuthService.validateSession(loginResult.sessionToken);
    expect(sessionCheck).not.toBeNull();
    expect(sessionCheck?.user.email).toBe(testEmail);

    // Wrong password test
    await expect(
      AuthService.login({
        email: testEmail,
        password: 'WrongPassword@999',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('handles phone OTP request and verification workflow', async () => {
    const phone = '+919876543210';
    const otpReq = await AuthService.requestPhoneOtp({ phone });

    expect(otpReq.success).toBe(true);
    expect(otpReq.mockOtp).toBeDefined();

    // Verify with invalid OTP first
    await expect(
      AuthService.verifyPhoneOtp({
        phone,
        code: '000000',
      })
    ).rejects.toThrow('Incorrect verification code');

    // Verify with valid OTP
    const otpVerify = await AuthService.verifyPhoneOtp({
      phone,
      code: otpReq.mockOtp!,
    });

    expect(otpVerify.user.phone).toBe(phone);
    expect(otpVerify.user.phoneVerified).toBe(true);
  });

  it('executes password reset token request and reset completion', async () => {
    const resetReq = await AuthService.requestPasswordReset(testEmail);
    expect(resetReq.success).toBe(true);
    expect(resetReq.token).toBeDefined();

    const newPassword = 'NewSecretPassword@999';
    await AuthService.resetPassword(resetReq.token!, newPassword);

    // Old password fails
    await expect(
      AuthService.login({
        email: testEmail,
        password: testPassword,
      })
    ).rejects.toThrow('Invalid email or password');

    // New password succeeds
    const newLogin = await AuthService.login({
      email: testEmail,
      password: newPassword,
    });
    expect(newLogin.user.email).toBe(testEmail);
  });
});
