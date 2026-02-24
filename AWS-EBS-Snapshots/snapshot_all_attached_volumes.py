import boto3


def snapshot_all_attached_volumes_handler(event, context):
    print('Begining automated snapshot of all attached volumes.')
    ec2 = boto3.resource('ec2')

    retainTagKey = event.get('retain_tag_key', 'Retain')
    retainTagValue = str(event.get('retain_tag_value', 'false'))
    instanceIds = event.get('instance_ids')

    if instanceIds:
        instances = ec2.instances.filter(InstanceIds=instanceIds)
    else:
        instances = ec2.instances.all()

    createdCount = 0
    skippedCount = 0

    for instance in instances:
        instId = instance.id
        stateName = instance.state.get('Name')

        if stateName != 'running' and stateName != 'stopped':
            print('Skipping instance [{0}] in state [{1}]'.format(instId, stateName))
            skippedCount += 1
            continue

        for mapping in instance.block_device_mappings:
            ebs = mapping.get('Ebs')
            if not ebs:
                continue

            volId = ebs.get('VolumeId')
            if not volId:
                continue

            attachment = mapping.get('DeviceName', 'unknown')
            description = 'Automated Snapshot of [{0}] attached as [{1}] to [{2}].'.format(volId, attachment, instId)

            snapshot = ec2.create_snapshot(VolumeId=volId, Description=description)
            snapshot.create_tags(Tags=[{'Key': retainTagKey, 'Value': retainTagValue}])
            createdCount += 1
            print(description)

    return 'Finished automated snapshot of all attached volumes. Created {0} snapshot(s), skipped {1} instance(s).'.format(createdCount, skippedCount)
