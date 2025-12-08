'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/provider';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  signInWithCredential,
  ConfirmationResult
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PhoneAuthProps {
  onSuccess: (phoneNumber: string) => void;
  mode: 'signup' | 'login';
}

export function PhoneAuth({ onSuccess, mode }: PhoneAuthProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  useEffect(() => {
    if (!auth || typeof window === 'undefined') return;

    // Initialize reCAPTCHA verifier
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'normal',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        toast({
          variant: 'destructive',
          title: 'reCAPTCHA Expired',
          description: 'Please try again.',
        });
      },
    });

    setRecaptchaVerifier(verifier);

    return () => {
      verifier.clear();
    };
  }, [auth, toast]);

  const handleSendCode = async () => {
    if (!auth || !recaptchaVerifier || !phoneNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid phone number.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Format phone number (add + if not present)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      toast({
        title: 'Code Sent!',
        description: 'Please check your phone for the verification code.',
      });
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send verification code.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult || !verificationCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the verification code.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      toast({
        title: 'Phone Verified!',
        description: 'Your phone number has been verified.',
      });
      onSuccess(phoneNumber);
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        variant: 'destructive',
        title: 'Invalid Code',
        description: error.message || 'The verification code is incorrect.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Enter your phone number with country code (e.g., +1234567890)
          </p>
        </div>
        <div id="recaptcha-container"></div>
        <Button 
          onClick={handleSendCode} 
          className="w-full" 
          disabled={isLoading || !phoneNumber.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Verification Code'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Verification Code</Label>
        <Input
          id="code"
          type="text"
          placeholder="123456"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          disabled={isLoading}
          maxLength={6}
        />
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code sent to {phoneNumber}
        </p>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline"
          onClick={() => {
            setStep('phone');
            setVerificationCode('');
            setConfirmationResult(null);
          }}
          disabled={isLoading}
        >
          Change Number
        </Button>
        <Button 
          onClick={handleVerifyCode} 
          className="flex-1" 
          disabled={isLoading || verificationCode.length !== 6}
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>
      </div>
    </div>
  );
}

