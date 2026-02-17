function CIDR(cidr) {
    if (!this.isValidCidrFormat(cidr)) {
        throw new Error('Invalid CIDR format');
    }

    var parts = cidr.split('/');
    var address = parts[0];
    var prefix = parseInt(parts[1], 10);

    this.prefix = prefix;
    this.address = this.ipToLong(address);
    this.mask = this.createMask(this.prefix);
    this.network = this.address & this.mask;
    this.originalCidr = cidr;
}

CIDR.prototype.isValidCidrFormat = function (cidr) {
    var cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(cidr)) {
        return false;
    }

    var parts = cidr.split('/');
    var ip = parts[0];
    var prefix = parseInt(parts[1], 10);
    var octets = ip.split('.');

    for (var i = 0; i < octets.length; i++) {
        var num = parseInt(octets[i], 10);
        if (num < 0 || num > 255) {
            return false;
        }
    }

    return prefix >= 0 && prefix <= 32;
};

CIDR.prototype.ipToLong = function (ip) {
    var octets = ip.split('.');
    var value = 0;

    for (var i = 0; i < octets.length; i++) {
        value = (value << 8) + parseInt(octets[i], 10);
    }

    return value >>> 0;
};

CIDR.prototype.longToIp = function (longVal) {
    return [
        (longVal >>> 24) & 255,
        (longVal >>> 16) & 255,
        (longVal >>> 8) & 255,
        longVal & 255
    ].join('.');
};

CIDR.prototype.createMask = function (prefix) {
    if (prefix === 0) {
        return 0;
    }

    return (0xffffffff << (32 - prefix)) >>> 0;
};

CIDR.prototype.getNetworkAddress = function () {
    return this.longToIp(this.network);
};

CIDR.prototype.getBroadcastAddress = function () {
    if (this.prefix === 32) {
        return this.longToIp(this.network);
    }

    var hostMask = Math.pow(2, (32 - this.prefix)) - 1;
    return this.longToIp((this.network + hostMask) >>> 0);
};

CIDR.prototype.getFirstUsableAddress = function () {
    if (this.prefix >= 31) {
        return null;
    }

    return this.longToIp(this.network + 1);
};

CIDR.prototype.getLastUsableAddress = function () {
    if (this.prefix >= 31) {
        return null;
    }

    var hostMask = Math.pow(2, (32 - this.prefix)) - 1;
    var broadcast = (this.network + hostMask) >>> 0;
    return this.longToIp(broadcast - 1);
};

CIDR.prototype.getTotalHosts = function () {
    if (this.prefix >= 31) {
        return 0;
    }

    return Math.pow(2, (32 - this.prefix)) - 2;
};

CIDR.prototype.isInRange = function (ip) {
    var ipLong = this.ipToLong(ip);
    return (ipLong & this.mask) === this.network;
};


function IPv4Address(address, cidr) {
    var parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some(function (p) { return isNaN(p) || p < 0 || p > 255; })) {
        throw new Error('Invalid IP address format.');
    }
    if (cidr < 0 || cidr > 32) {
        throw new Error('CIDR must be between 0 and 32.');
    }

    this.octets = parts;
    this.cidr = cidr;
    this.address = this.octets.join('.');
    this.cidrNotation = this.address + '/' + this.cidr;
    this.lastNetworkOctet = Math.ceil(this.cidr / 8);

    // Backward-compatible aliases.
    this.Octet1 = this.octets[0];
    this.Octet2 = this.octets[1];
    this.Octet3 = this.octets[2];
    this.Octet4 = this.octets[3];
}

IPv4Address.prototype.getAddressClass = function () {
    var first = this.octets[0];
    if (first >= 1 && first <= 126) return 'A';
    if (first >= 128 && first <= 191) return 'B';
    if (first >= 192 && first <= 223) return 'C';
    if (first >= 224 && first <= 239) return 'D';
    if (first >= 240 && first <= 254) return 'E';
    return 'localhost';
};

IPv4Address.prototype.isPrivate = function () {
    var o1 = this.octets[0];
    var o2 = this.octets[1];

    return (
        o1 === 10 ||
        (o1 === 172 && o2 >= 16 && o2 <= 31) ||
        (o1 === 192 && o2 === 168)
    );
};

IPv4Address.prototype.getOctetBits = function (octetNum) {
    if (octetNum < 1 || octetNum > 4) {
        throw new Error('Invalid octet number: ' + octetNum);
    }

    if (octetNum < this.lastNetworkOctet) return 8;
    if (octetNum > this.lastNetworkOctet) return 0;
    return this.cidr - ((octetNum - 1) * 8);
};

IPv4Address.prototype.getOctetMask = function (octetNum) {
    var bits = this.getOctetBits(octetNum);
    return bits === 0 ? 0 : (0xff << (8 - bits)) & 0xff;
};

IPv4Address.prototype.getSubnetMask = function () {
    return [
        this.getOctetMask(1),
        this.getOctetMask(2),
        this.getOctetMask(3),
        this.getOctetMask(4)
    ].join('.');
};


function PrivateSubnet(subnetAddress, networkCidr, subnetCidr) {
    if (typeof subnetCidr === 'undefined') {
        subnetCidr = networkCidr;
    }

    this.network = new IPv4Address(subnetAddress, networkCidr);
    this.address = new IPv4Address(subnetAddress, subnetCidr);

    this.hostBits = 32 - subnetCidr;
    this.addressCount = Math.pow(2, this.hostBits);
    this.hostCount = this.addressCount - 2;

    this.firstAddress = this.computeAddress(1);
    this.lastAddress = this.computeAddress(this.addressCount - 2);
    this.defaultGateway = this.computeAddress(1);
    this.broadcastAddress = this.computeAddress(this.addressCount - 1);
    this.localVPCDNS = this.computeAddress(2);
    this.localVPCReserved = this.computeAddress(3);

    this.isUsableInVPC = this.calculateIsUsableInVPC();
    this.isVPCUseRecommended = this.calculateIsVPCUseRecommended();

    this.subnetCount = Math.pow(2, (subnetCidr - networkCidr));

    // Backward-compatible aliases.
    this.Network = this.network;
    this.Address = this.address;
    this.NetworkCIDR = this.address.cidrNotation;
    this.FirstAddress = this.firstAddress;
    this.LastAddress = this.lastAddress;
    this.BroadcastAddress = this.broadcastAddress;
    this.LocalVPCRouter = this.defaultGateway;
    this.LocalVPCDNS = this.localVPCDNS;
    this.LocalVPCReserved = this.localVPCReserved;
    this.Octet1 = this.address.Octet1;
    this.Octet2 = this.address.Octet2;
    this.Octet3 = this.address.Octet3;
    this.Octet4 = this.address.Octet4;
}

PrivateSubnet.prototype.calculateIsUsableInVPC = function () {
    return this.address.cidr >= 16 && this.address.cidr <= 28;
};

PrivateSubnet.prototype.calculateIsVPCUseRecommended = function () {
    var cls = this.address.getAddressClass();
    return (
        this.address.isPrivate() &&
        this.isUsableInVPC &&
        cls !== 'D' &&
        cls !== 'E'
    );
};

PrivateSubnet.prototype.ipToInt = function (octets) {
    return (
        ((octets[0] << 24) >>> 0) |
        (octets[1] << 16) |
        (octets[2] << 8) |
        octets[3]
    ) >>> 0;
};

PrivateSubnet.prototype.intToIP = function (intVal) {
    return [
        (intVal >>> 24) & 0xff,
        (intVal >>> 16) & 0xff,
        (intVal >>> 8) & 0xff,
        intVal & 0xff
    ].join('.');
};

PrivateSubnet.prototype.computeAddress = function (hostOffset) {
    var base = this.address.octets.slice();
    var ipAsNumber = this.ipToInt(base);
    ipAsNumber += hostOffset;

    return this.intToIP(ipAsNumber);
};

PrivateSubnet.prototype.Next = function () {
    var nextBase = this.ipToInt(this.address.octets) + this.addressCount;
    return new PrivateSubnet(this.intToIP(nextBase), this.network.cidr, this.address.cidr);
};
