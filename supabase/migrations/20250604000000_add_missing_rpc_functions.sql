-- Add missing RPC functions for duty calculations and reviewer workload stats

-- Function to get effective duty rate
CREATE OR REPLACE FUNCTION get_effective_duty_rate(
    p_hs_code text,
    p_destination_country text,
    p_origin_country text DEFAULT NULL,
    p_trade_agreement text DEFAULT NULL,
    p_effective_date text DEFAULT NULL
)
RETURNS TABLE (
    duty_rate numeric,
    vat_rate numeric,
    preferential_treatment boolean,
    trade_agreement_applied text,
    confidence numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Basic implementation - can be enhanced based on business logic
    RETURN QUERY
    SELECT 
        COALESCE(dr.duty_rate, 0.0)::numeric as duty_rate,
        COALESCE(dr.vat_rate, 0.0)::numeric as vat_rate,
        COALESCE(dr.preferential_treatment, false) as preferential_treatment,
        COALESCE(dr.trade_agreement, 'NONE')::text as trade_agreement_applied,
        COALESCE(dr.confidence_score, 0.5)::numeric as confidence
    FROM duty_rules dr
    WHERE dr.hs_code = p_hs_code
      AND dr.destination_country = p_destination_country
      AND (p_origin_country IS NULL OR dr.origin_country = p_origin_country)
      AND (p_trade_agreement IS NULL OR dr.trade_agreement = p_trade_agreement)
    ORDER BY dr.confidence_score DESC
    LIMIT 1;
    
    -- If no specific rule found, return default values
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            0.0::numeric as duty_rate,
            0.0::numeric as vat_rate,
            false as preferential_treatment,
            'NONE'::text as trade_agreement_applied,
            0.1::numeric as confidence;
    END IF;
END;
$$;

-- Function to get reviewer workload statistics
CREATE OR REPLACE FUNCTION get_reviewer_workload_stats(
    reviewer_id uuid DEFAULT NULL,
    workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
    reviewer_id uuid,
    pending_reviews integer,
    overdue_reviews integer,
    avg_review_time numeric,
    workload_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH reviewer_stats AS (
        SELECT 
            rq.assigned_to as reviewer_id,
            COUNT(*) FILTER (WHERE rq.status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE rq.status = 'pending' AND rq.due_date < NOW()) as overdue_count,
            AVG(EXTRACT(EPOCH FROM (rq.completed_at - rq.created_at))/3600) FILTER (WHERE rq.completed_at IS NOT NULL) as avg_hours,
            COUNT(*) FILTER (WHERE rq.status = 'pending') * 1.0 + 
            COUNT(*) FILTER (WHERE rq.status = 'pending' AND rq.due_date < NOW()) * 2.0 as workload
        FROM review_queue rq
        WHERE (get_reviewer_workload_stats.reviewer_id IS NULL OR rq.assigned_to = get_reviewer_workload_stats.reviewer_id)
          AND (get_reviewer_workload_stats.workspace_id IS NULL OR rq.workspace_id = get_reviewer_workload_stats.workspace_id)
        GROUP BY rq.assigned_to
    )
    SELECT 
        rs.reviewer_id,
        rs.pending_count::integer as pending_reviews,
        rs.overdue_count::integer as overdue_reviews,
        COALESCE(rs.avg_hours, 0.0)::numeric as avg_review_time,
        rs.workload::numeric as workload_score
    FROM reviewer_stats rs;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_effective_duty_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_reviewer_workload_stats TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_effective_duty_rate IS 'Calculate effective duty rate considering trade agreements and preferential treatment';
COMMENT ON FUNCTION get_reviewer_workload_stats IS 'Get reviewer workload statistics including pending and overdue reviews';