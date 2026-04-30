import { useEffect, useState } from "react";
import api from "@/services/api";

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  trust_score: number;
  created_at: string;
  last_active?: string;
}

export interface AdminListing {
  id: string;
  title: string;
  owner: {
    id: string;
    full_name: string;
  };
  city: string;
  rent_monthly?: number; // Backend might not have it in the summary yet, but UI expects it.
  status: string;
  metrics: {
    view_count: number;
    interest_count: number;
  };
  created_at: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/users");
      setUsers(response.data.items); // Items instead of users
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, isLoading, error, refetch: fetchUsers };
}

export function useAdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/listings");
      setListings(response.data.items); // Items instead of listings
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch listings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return { listings, isLoading, error, refetch: fetchListings };
}

export interface AdminHousehold {
  id: string;
  name: string;
  status: string;
  member_count: number;
  created_at: string;
}

export function useAdminHouseholds() {
  const [households, setHouseholds] = useState<AdminHousehold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholds = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/households");
      setHouseholds(response.data.items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch households");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  return { households, isLoading, error, refetch: fetchHouseholds };
}

export interface AdminInterest {
  id: string;
  from_user: { id: string; full_name: string };
  to_listing?: { id: string; title: string };
  to_user?: { id: string; full_name: string };
  status: string;
  compatibility_score: number;
  created_at: string;
}

export function useAdminInterests() {
  const [interests, setInterests] = useState<AdminInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/interests");
      setInterests(response.data.items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch interests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, []);

  return { interests, isLoading, error, refetch: fetchInterests };
}

export interface AdminMessage {
  id: string;
  user_a: { id: string; full_name: string };
  user_b: { id: string; full_name: string };
  listing_title?: string;
  last_message?: string;
  status: string;
  created_at: string;
}

export function useAdminMessages() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/messages");
      setMessages(response.data.items);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return { messages, isLoading, error, refetch: fetchMessages };
}
