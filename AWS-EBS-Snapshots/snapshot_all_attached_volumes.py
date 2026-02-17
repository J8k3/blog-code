import boto3


def snapshot_all_attached_volumes_handler(event, context):
    print("Beginning automated snapshot of all attached volumes.")
    ec2 = boto3.resource("ec2")

    retain_tag_key = event.get("retain_tag_key", "Retain")
    retain_tag_value = str(event.get("retain_tag_value", "false"))
    instance_ids = event.get("instance_ids")

    if instance_ids:
        instances = ec2.instances.filter(InstanceIds=instance_ids)
    else:
        instances = ec2.instances.all()

    created_count = 0
    skipped_count = 0

    for instance in instances:
        instance_id = instance.id

        if instance.state.get("Name") not in {"running", "stopped"}:
            print(f"Skipping instance [{instance_id}] in state [{instance.state.get('Name')}]")
            skipped_count += 1
            continue

        for mapping in instance.block_device_mappings:
            ebs = mapping.get("Ebs")
            if not ebs:
                continue

            volume_id = ebs.get("VolumeId")
            if not volume_id:
                continue

            attachment = mapping.get("DeviceName", "unknown")
            description = (
                f"Automated snapshot of [{volume_id}] attached as [{attachment}] "
                f"to [{instance_id}]."
            )

            snapshot = ec2.create_snapshot(VolumeId=volume_id, Description=description)
            snapshot.create_tags(Tags=[{"Key": retain_tag_key, "Value": retain_tag_value}])
            created_count += 1
            print(description)

    return {
        "message": "Finished automated snapshot of all attached volumes.",
        "created_snapshots": created_count,
        "skipped_instances": skipped_count,
        "retain_tag_key": retain_tag_key,
        "retain_tag_value": retain_tag_value,
    }