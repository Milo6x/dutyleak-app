-- This policy allows users to read rows from the review_queue
-- if the row's workspace_id matches a workspace they are a member of.
-- This is consistent with the policies on your other tables.

CREATE POLICY "Enable read access for workspace members"
ON public.review_queue
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM public.workspace_users
    WHERE user_id = auth.uid()
  )
);

-- Note: You may also want to add policies for INSERT, UPDATE, and DELETE
