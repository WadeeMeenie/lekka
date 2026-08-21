import { validateFeedbackSubmission, type FeedbackSubmission } from "@/lib/feedback";
import { supabase } from "@/lib/supabase";

function unavailable() {
  return { error: new Error("Feedback is unavailable until Lekka can connect to its secure service.") };
}

export async function submitBetaFeedback(input: FeedbackSubmission) {
  const validation = validateFeedbackSubmission(input);
  const feedback = validation.data;
  if (!feedback) return { error: new Error(validation.error) };
  if (!supabase) return unavailable();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { error: userError };
  if (!user) return { error: new Error("Please sign in before sending feedback.") };

  const { error } = await supabase.from("beta_feedback").insert({
    user_id: user.id,
    type: feedback.type,
    title: feedback.title,
    description: feedback.description,
    app_version: feedback.appVersion,
  });

  return { error };
}
