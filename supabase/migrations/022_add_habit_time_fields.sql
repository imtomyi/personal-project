-- 습관에 시간표 연동용 시간/요일 필드 추가
ALTER TABLE habits ADD COLUMN IF NOT EXISTS time_start text;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS time_end text;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS days_of_week integer[];
