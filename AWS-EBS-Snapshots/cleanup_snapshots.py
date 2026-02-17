import os
from datetime import datetime, timedelta, timezone

import boto3

def clean_snapshots_handler(event, context):
    print("Beginning automated snapshot cleanup.")
    ec2 = boto3.resource("ec2")

    retention_days = int(event.get("retention_days", 7))
    delete_time = datetime.now(timezone.utc) - timedelta(days=retention_days)
    print(f"Deleting snapshots older than [{delete_time.isoformat()}]")

    snapshots = ec2.snapshots.filter(
        OwnerIds=["self"],
        Filters=[{"Name": "tag:Retain", "Values": ["false"]}],
    )

    deleted_count = 0
    for snapshot in snapshots:
        print(f"Evaluating snapshot [{snapshot.snapshot_id}]")
        if snapshot.start_time <= delete_time:
            print(f"Deleting snapshot [{snapshot.snapshot_id}]")
            snapshot.delete()
            deleted_count += 1

    return f"Finished automated snapshot cleanup. Deleted {deleted_count} snapshot(s)."