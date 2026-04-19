import { useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Login from "./Login";

type GymData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
};

export default function GymLogin() {
  const { slug } = useParams<{ slug: string }>();
  const [gym, setGym] = useState<GymData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem("last_gym_slug", slug);
    supabase
      .from("gyms")
      .select("id, name, slug, logo_url, primary_color")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setGym(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !gym) return <Navigate to="/" replace />;

  return <Login gymId={gym.id} gymSlug={gym.slug} gymName={gym.name} gymLogoUrl={gym.logo_url} gymColor={gym.primary_color} />;
}
