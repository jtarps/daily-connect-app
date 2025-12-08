
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth, useFirestore, useUser } from '@/firebase/provider';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhoneAuth } from './phone-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function SignupForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase is not available. Please refresh the page.',
      });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox to verify your email address.',
      });

      // Create user profile in Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
      });

      toast({
        title: 'Account Created!',
        description: "You're all set up. Please verify your email.",
      });
      router.push('/check-in');
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  const handlePhoneAuthSuccess = async (phoneNumber: string) => {
    if (!auth || !firestore) return;
    
    // User is already authenticated via phone, just need to create/update profile
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Authentication failed. Please try again.',
      });
      return;
    }

    try {
      // Get user's name from form if available, or prompt for it
      const firstName = form.getValues('firstName') || '';
      const lastName = form.getValues('lastName') || '';

      if (!firstName || !lastName) {
        // If name not provided, we'll need to get it
        // For now, create profile with phone number
        await setDoc(doc(firestore, 'users', currentUser.uid), {
          id: currentUser.uid,
          firstName: firstName || 'User',
          lastName: lastName || '',
          phoneNumber: phoneNumber,
        }, { merge: true });

        toast({
          title: 'Account Created!',
          description: 'Your account has been created with phone authentication.',
        });
        router.push('/check-in');
      } else {
        await setDoc(doc(firestore, 'users', currentUser.uid), {
          id: currentUser.uid,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
        });

        toast({
          title: 'Account Created!',
          description: 'Your account has been created with phone authentication.',
        });
        router.push('/check-in');
      }
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create user profile. Please try again.',
      });
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Join Daily Connect to stay in touch.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-4">
                    <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                            <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="phone" className="space-y-4 mt-4">
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <PhoneAuth onSuccess={handlePhoneAuthSuccess} mode="signup" />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p>Already have an account?&nbsp;</p>
        <Link href="/login" className="text-primary hover:underline">
          Login
        </Link>
      </CardFooter>
    </Card>
  );
}
