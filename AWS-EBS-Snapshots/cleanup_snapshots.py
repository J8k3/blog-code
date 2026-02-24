import boto3
from datetime import datetime, timedelta, timezone


def clean_snapshots_handler(event, context):
    print('Begining automated snapshot cleanup.')
    ec2 = boto3.resource('ec2')

    retentionDays = int(event.get('retention_days', 7))
    deleteTime = datetime.now(timezone.utc) - timedelta(days=retentionDays)
    print('Deleting snapshots older than [{0}]'.format(deleteTime.isoformat()))

    snapshots = ec2.snapshots.filter(
        OwnerIds=['self'],
        Filters=[{'Name': 'tag:Retain', 'Values': ['false']}],
    )

    deletedCount = 0
    for snapshot in snapshots:
        snapshotId = snapshot.snapshot_id
        print('Evaluating snapshot [{0}]'.format(snapshotId))

        if snapshot.start_time <= deleteTime:
            print('Deleting snapshot [{0}]'.format(snapshotId))
            snapshot.delete()
            deletedCount += 1

    return 'Finished automated snapshot cleanup. Deleted {0} snapshot(s).'.format(deletedCount)
