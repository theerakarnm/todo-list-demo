CREATE TABLE `cron_runs` (
	`job` text PRIMARY KEY NOT NULL,
	`last_run_on` text NOT NULL
);
