# AWS EBS Snapshot Automation

This folder contains two AWS Lambda handlers:

- `snapshot_all_attached_volumes.py`:
  Creates EBS snapshots for attached volumes on EC2 instances.
- `cleanup_snapshots.py`:
  Deletes old snapshots based on a retention window.

## Handlers

- Snapshot creator handler: `snapshot_all_attached_volumes.snapshot_all_attached_volumes_handler`
- Cleanup handler: `cleanup_snapshots.clean_snapshots_handler`

## 1) Snapshot Creator Lambda

File: `snapshot_all_attached_volumes.py`

### What it does

- Iterates EC2 instances (or specific `instance_ids` from event input)
- Finds attached EBS volumes
- Creates snapshots
- Tags each snapshot with a configurable retention tag

### Event input

```json
{
  "instance_ids": ["i-0123456789abcdef0"],
  "retain_tag_key": "Retain",
  "retain_tag_value": "false"
}
```

All fields are optional.

Defaults:

- `retain_tag_key`: `Retain`
- `retain_tag_value`: `false`
- `instance_ids`: all instances in the account/region

### Return value

```json
{
  "message": "Finished automated snapshot of all attached volumes.",
  "created_snapshots": 3,
  "skipped_instances": 1,
  "retain_tag_key": "Retain",
  "retain_tag_value": "false"
}
```

## 2) Cleanup Lambda

File: `cleanup_snapshots.py`

### What it does

- Lists snapshots owned by your account with tag `Retain=false`
- Deletes snapshots older than `retention_days`

### Event input

```json
{
  "retention_days": 7
}
```

If omitted, default is 7 days.

### Return value

String summary, for example:

`Finished automated snapshot cleanup. Deleted 5 snapshot(s).`

## IAM Permissions

Attach an IAM policy that includes at least:

- `ec2:DescribeInstances`
- `ec2:DescribeVolumes`
- `ec2:CreateSnapshot`
- `ec2:CreateTags`
- `ec2:DescribeSnapshots`
- `ec2:DeleteSnapshot`

Scope resources as tightly as your environment allows.

## Scheduling (EventBridge)

Typical setup:

- Run snapshot creator daily (for example: `cron(0 1 * * ? *)`)
- Run cleanup daily after snapshot creation (for example: `cron(0 3 * * ? *)`)

Use the same AWS region where your EC2 volumes exist.

## Notes

- Test first in a non-production account.
- Ensure snapshots needed for compliance/disaster recovery are tagged to avoid deletion.
- Keep cleanup retention aligned with business recovery requirements.
