ALTER TABLE notifications
    ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_notifications_pinned_created_at
    ON notifications (pinned, created_at);
