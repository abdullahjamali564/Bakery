import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

const api =
    String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:4000/api');
const orange = Color(0xffd95f35);
const cream = Color(0xfff5f0e8);
const ink = Color(0xff27312e);
String money(num value) => 'PKR ${value.toStringAsFixed(0)}';

void main() => runApp(const PortosApp());

class PortosApp extends StatelessWidget {
  const PortosApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          scaffoldBackgroundColor: cream,
          colorScheme: ColorScheme.fromSeed(seedColor: orange),
          fontFamily: 'Georgia',
          inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: Colors.white,
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
      home: const StoreShell());
}

class StoreShell extends StatefulWidget {
  const StoreShell({super.key});
  @override
  State<StoreShell> createState() => _StoreShellState();
}

class _StoreShellState extends State<StoreShell> {
  int tab = 0;
  List products = const [
    {
      '_id': '1',
      'name': 'Butter Croissant',
      'description': 'Laminated, golden and impossibly light.',
      'category': 'Morning',
      'price': 950,
      'image': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800'
    },
    {
      '_id': '2',
      'name': 'Cinnamon Knot',
      'description': 'Brown sugar, cinnamon and a soft pull-apart crumb.',
      'category': 'Morning',
      'price': 1150,
      'image':
          'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800'
    },
    {
      '_id': '3',
      'name': 'Sourdough Loaf',
      'description': 'Naturally leavened over 36 hours.',
      'category': 'Breads',
      'price': 2200,
      'image':
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800'
    },
  ];
  final cart = <Map<String, dynamic>>[];
  final orders = <Map<String, dynamic>>[];
  Timer? orderRefreshTimer;
  @override
  void initState() {
    super.initState();
    http.get(Uri.parse('$api/products')).then((response) {
      if (response.statusCode == 200 && mounted)
        setState(() => products = jsonDecode(response.body));
    }).catchError((_) {});
    orderRefreshTimer = Timer.periodic(
        const Duration(seconds: 5), (_) => refreshOrderStatuses());
    loadSavedOrders();
  }

  int get count =>
      cart.fold(0, (total, item) => total + item['quantity'] as int);
  void add(Map item) {
    setState(() {
      final matches = cart.where((entry) => entry['_id'] == item['_id']);
      if (matches.isEmpty) {
        cart.add({...item, 'quantity': 1});
      } else {
        matches.first['quantity']++;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Added to cart'), behavior: SnackBarBehavior.floating));
  }

  void change(Map<String, dynamic> item, int delta) => setState(() {
        item['quantity'] += delta;
        if (item['quantity'] <= 0) cart.remove(item);
      });

  Future<void> refreshOrderStatuses() async {
    var changed = false;
    for (final order in List<Map<String, dynamic>>.from(orders)) {
      final response = await http.get(Uri.parse('$api/orders/${order['id']}'));
      if (response.statusCode == 200 && mounted) {
        final data = jsonDecode(response.body);
        if (data['status'] != order['status']) {
          setState(() => order['status'] = data['status']);
          changed = true;
        }
      }
    }
    if (changed) await saveOrders();
  }

  Future<void> loadSavedOrders() async {
    final preferences = await SharedPreferences.getInstance();
    final saved = preferences.getString('portos_orders');
    if (saved == null) return;
    try {
      final decoded = jsonDecode(saved) as List;
      if (!mounted) return;
      setState(() {
        orders
          ..clear()
          ..addAll(decoded.map((order) => Map<String, dynamic>.from(order)));
      });
      await refreshOrderStatuses();
    } on FormatException {
      await preferences.remove('portos_orders');
    }
  }

  Future<void> saveOrders() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('portos_orders', jsonEncode(orders));
  }

  @override
  void dispose() {
    orderRefreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      MenuPage(products: products, onAdd: add),
      CartPage(
          cart: cart,
          onChange: change,
          onRemove: (item) => setState(() => cart.remove(item)),
          onCheckout: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => CheckoutPage(
                      cart: cart,
                      onOrderPlaced: (order) {
                        setState(() {
                          orders.insert(0, order);
                          cart.clear();
                          tab = 2;
                        });
                        saveOrders();
                        Navigator.pop(context);
                      })))),
      OrdersPage(orders: orders, onRefresh: refreshOrderStatuses),
      const AboutPage()
    ];
    return Scaffold(
        appBar: AppBar(
            backgroundColor: cream,
            elevation: 0,
            title: const Text("PORTO'S BAKERY",
                style: TextStyle(fontSize: 17, letterSpacing: 1)),
            actions: [
              IconButton(
                  onPressed: () => setState(() => tab = 1),
                  icon: Badge(
                      label: Text('$count'),
                      child: const Icon(Icons.shopping_bag_outlined,
                          color: orange)))
            ]),
        body: pages[tab],
        bottomNavigationBar: NavigationBar(
            selectedIndex: tab,
            onDestinationSelected: (value) => setState(() => tab = value),
            destinations: const [
              NavigationDestination(
                  icon: Icon(Icons.storefront_outlined), label: 'Menu'),
              NavigationDestination(
                  icon: Icon(Icons.shopping_bag_outlined), label: 'Cart'),
              NavigationDestination(
                  icon: Icon(Icons.receipt_long_outlined), label: 'Orders'),
              NavigationDestination(
                  icon: Icon(Icons.info_outline), label: 'About')
            ]));
  }
}

class MenuPage extends StatefulWidget {
  final List products;
  final void Function(Map) onAdd;
  const MenuPage({super.key, required this.products, required this.onAdd});
  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  String category = 'All';
  @override
  Widget build(BuildContext context) {
    final categories = <String>[
      'All',
      ...widget.products
          .map<String>((item) => item['category'] as String)
          .toSet()
    ];
    final visible = widget.products
        .where((item) => category == 'All' || item['category'] == category);
    return ListView(padding: const EdgeInsets.all(20), children: [
      const Text('BAKED DAILY IN SMALL BATCHES',
          style: TextStyle(color: orange, fontSize: 11, letterSpacing: 1.5)),
      const SizedBox(height: 14),
      const Text('Good bread.\nBetter mornings.',
          style: TextStyle(fontSize: 42, height: 1)),
      const SizedBox(height: 25),
      SizedBox(
          height: 40,
          child: ListView(
              scrollDirection: Axis.horizontal,
              children: categories
                  .map((item) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                          label: Text(item),
                          selected: item == category,
                          onSelected: (_) => setState(() => category = item))))
                  .toList())),
      const SizedBox(height: 20),
      ...visible.map(
          (item) => ProductCard(product: item, onAdd: () => widget.onAdd(item)))
    ]);
  }
}

class ProductCard extends StatelessWidget {
  final Map product;
  final VoidCallback onAdd;
  const ProductCard({super.key, required this.product, required this.onAdd});
  @override
  Widget build(BuildContext context) => Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Image.network(product['image'],
            height: 190,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                Container(height: 190, color: const Color(0xffdce5d8))),
        Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(product['name'], style: const TextStyle(fontSize: 19)),
                    Text(product['description'],
                        style: TextStyle(
                            color: Colors.grey.shade600, fontSize: 12))
                  ])),
              Column(children: [
                Text(money(product['price'])),
                IconButton(
                    onPressed: onAdd,
                    icon: const Icon(Icons.add_circle, color: orange))
              ])
            ]))
      ]));
}

class CartPage extends StatelessWidget {
  final List<Map<String, dynamic>> cart;
  final void Function(Map<String, dynamic>, int) onChange;
  final void Function(Map<String, dynamic>) onRemove;
  final VoidCallback onCheckout;
  const CartPage(
      {super.key,
      required this.cart,
      required this.onChange,
      required this.onRemove,
      required this.onCheckout});
  @override
  Widget build(BuildContext context) {
    final subtotal = cart.fold<double>(
        0, (sum, item) => sum + item['price'] * item['quantity']);
    return ListView(padding: const EdgeInsets.all(20), children: [
      const Text('Your cart', style: TextStyle(fontSize: 30)),
      const SizedBox(height: 12),
      if (cart.isEmpty)
        const Padding(
            padding: EdgeInsets.symmetric(vertical: 80),
            child: Center(
                child: Text('Your cart is waiting for something warm.'))),
      ...cart.map((item) => Card(
          elevation: 0,
          child: Row(children: [
            Expanded(
                child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['name'],
                              style: const TextStyle(fontSize: 17)),
                          Text(money(item['price'] * item['quantity']),
                              style: const TextStyle(color: orange)),
                          Row(children: [
                            IconButton(
                                onPressed: () => onChange(item, -1),
                                icon: const Icon(Icons.remove_circle_outline)),
                            Text('${item['quantity']}'),
                            IconButton(
                                onPressed: () => onChange(item, 1),
                                icon: const Icon(Icons.add_circle_outline,
                                    color: orange))
                          ])
                        ]))),
            IconButton(
                onPressed: () => onRemove(item),
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent))
          ]))),
      if (cart.isNotEmpty) ...[
        const SizedBox(height: 12),
        Text('Subtotal  ${money(subtotal)}'),
        const SizedBox(height: 14),
        FilledButton(
            onPressed: onCheckout,
            style: FilledButton.styleFrom(backgroundColor: orange),
            child: const Text('Continue to delivery'))
      ]
    ]);
  }
}

class CheckoutPage extends StatelessWidget {
  final List<Map<String, dynamic>> cart;
  final void Function(Map<String, dynamic>) onOrderPlaced;
  const CheckoutPage(
      {super.key, required this.cart, required this.onOrderPlaced});
  @override
  Widget build(BuildContext context) {
    final subtotal = cart.fold<double>(
        0, (sum, item) => sum + item['price'] * item['quantity']);
    final fee = subtotal >= 5000 ? 0 : 450;
    return Scaffold(
        appBar: AppBar(title: const Text('Delivery details')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          const Text('Almost there', style: TextStyle(fontSize: 30)),
          Text('Delivery fee: ${fee == 0 ? 'Free' : money(fee)}'),
          const SizedBox(height: 15),
          GuestForm(
              cart: cart, total: subtotal + fee, onOrderPlaced: onOrderPlaced)
        ]));
  }
}

class GuestForm extends StatefulWidget {
  final List<Map<String, dynamic>> cart;
  final double total;
  final void Function(Map<String, dynamic>) onOrderPlaced;
  const GuestForm(
      {super.key,
      required this.cart,
      required this.total,
      required this.onOrderPlaced});
  @override
  State<GuestForm> createState() => _GuestFormState();
}

class _GuestFormState extends State<GuestForm> {
  final form = GlobalKey<FormState>();
  final voucher = TextEditingController();
  bool sending = false;
  final fields = {
    for (final name in [
      'Name',
      'Phone',
      'Delivery address',
      'Longitude',
      'Latitude'
    ])
      name: TextEditingController()
  };
  Widget field(String name) => TextFormField(
      controller: fields[name],
      inputFormatters:
          name == 'Phone' ? [FilteringTextInputFormatter.digitsOnly] : null,
      keyboardType: name == 'Longitude' || name == 'Latitude'
          ? const TextInputType.numberWithOptions(decimal: true)
          : name == 'Phone'
              ? TextInputType.phone
              : TextInputType.text,
      validator: (value) {
        final text = value?.trim() ?? '';
        if (name == 'Phone') {
          return RegExp(r'^\d{11}$').hasMatch(text)
              ? null
              : 'Enter exactly 11 digits';
        }
        if (name == 'Longitude' || name == 'Latitude') return null;
        return text.isEmpty ? 'Required' : null;
      },
      decoration: InputDecoration(labelText: name));
  Future<void> locate() async {
    if (!await Geolocator.isLocationServiceEnabled()) return;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied)
      permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) return;
    final position = await Geolocator.getCurrentPosition();
    fields['Longitude']!.text = position.longitude.toStringAsFixed(6);
    fields['Latitude']!.text = position.latitude.toStringAsFixed(6);
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
                title: const Text('Confirm your order'),
                content: Text('Place this order for ${money(widget.total)}?'),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Review')),
                  FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Confirm'))
                ]));
    if (confirm != true) return;
    setState(() => sending = true);
    final body = {
      'items': widget.cart
          .map((item) => {'product': item['_id'], 'quantity': item['quantity']})
          .toList(),
      'paymentMethod': 'cash',
      'customer': {
        'name': fields['Name']!.text,
        'phone': fields['Phone']!.text,
        'address': fields['Delivery address']!.text,
        if (fields['Longitude']!.text.trim().isNotEmpty &&
            fields['Latitude']!.text.trim().isNotEmpty)
          'deliveryCoordinates': [
            double.parse(fields['Longitude']!.text),
            double.parse(fields['Latitude']!.text)
          ]
      }
    };
    try {
      final response = await http.post(Uri.parse('$api/orders/checkout'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body);
        widget.onOrderPlaced({
          'id': '${data['orderId']}',
          'status': data['status'] ?? 'Received',
          'name': fields['Name']!.text,
          'phone': fields['Phone']!.text,
          'total': widget.total,
          'subtotal': widget.cart.fold<num>(
              0, (sum, item) => sum + item['price'] * item['quantity']),
          'deliveryFee': widget.total -
              widget.cart.fold<num>(
                  0, (sum, item) => sum + item['price'] * item['quantity']),
          'paymentMethod': 'cash',
          'items': widget.cart
              .map((item) => {
                    'name': item['name'],
                    'quantity': item['quantity'],
                    'price': item['price'],
                    'total': item['price'] * item['quantity']
                  })
              .toList(),
          'address': fields['Delivery address']!.text
        });
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content:
                Text('Could not place order. Check the delivery details.')));
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Form(
      key: form,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        field('Name'),
        const SizedBox(height: 12),
        field('Phone'),
        const SizedBox(height: 12),
        field('Delivery address'),
        const SizedBox(height: 12),
        const Align(
            alignment: Alignment.centerLeft,
            child: Text('Location is optional',
                style: TextStyle(color: Colors.black54, fontSize: 12))),
        Row(children: [
          Expanded(child: field('Longitude')),
          const SizedBox(width: 12),
          Expanded(child: field('Latitude'))
        ]),
        Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
                onPressed: locate,
                icon: const Icon(Icons.my_location, color: orange),
                label: const Text('Use my device location'))),
        TextField(
            controller: voucher,
            decoration: const InputDecoration(
                labelText: 'Apply voucher (optional)',
                prefixIcon: Icon(Icons.local_offer_outlined))),
        const SizedBox(height: 20),
        FilledButton(
            onPressed: sending ? null : submit,
            style: FilledButton.styleFrom(backgroundColor: orange),
            child: Text(sending ? 'Sending...' : 'Place order'))
      ]));
}

class OrdersPage extends StatelessWidget {
  final List<Map<String, dynamic>> orders;
  final Future<void> Function() onRefresh;
  const OrdersPage({super.key, required this.orders, required this.onRefresh});
  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Order status', style: TextStyle(fontSize: 30)),
            const SizedBox(height: 14),
            if (orders.isEmpty)
              const Padding(
                  padding: EdgeInsets.symmetric(vertical: 80),
                  child: Center(
                      child: Text('Your placed orders will appear here.'))),
            ...orders.map((order) {
              final items = (order['items'] as List?) ?? const [];
              final subtotal =
                  (order['subtotal'] as num?) ?? (order['total'] as num? ?? 0);
              final deliveryFee = (order['deliveryFee'] as num?) ?? 0;
              return Card(
                elevation: 0,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                            'Order #${order['id'].toString().substring(order['id'].toString().length - 6)}'),
                        const SizedBox(height: 12),
                        _OrderDetail(
                            label: 'Name',
                            value: order['name'] ?? 'Not provided'),
                        _OrderDetail(
                            label: 'Phone',
                            value: order['phone'] ?? 'Not provided'),
                        _OrderDetail(
                            label: 'Address',
                            value: order['address'] ?? 'Not provided'),
                        const Divider(height: 24),
                        const Text('Items',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        ...items.map((item) {
                          if (item is! Map)
                            return _OrderDetail(
                                label: item.toString(), value: '');
                          final detail = Map<String, dynamic>.from(item);
                          return _OrderDetail(
                              label:
                                  '${detail['quantity']} × ${detail['name']}',
                              value: money((detail['total'] as num?) ?? 0));
                        }),
                        _OrderDetail(label: 'Subtotal', value: money(subtotal)),
                        _OrderDetail(
                            label: 'Delivery fee', value: money(deliveryFee)),
                        _OrderDetail(
                            label: 'Payment',
                            value: order['paymentMethod'] ?? 'Cash'),
                        Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Chip(label: Text(order['status'])),
                              Text(money(order['total']))
                            ])
                      ]),
                ),
              );
            }),
          ],
        ),
      );
}

class _OrderDetail extends StatelessWidget {
  final String label;
  final String value;
  const _OrderDetail({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(
            child: Text(label, style: TextStyle(color: Colors.grey.shade700))),
        const SizedBox(width: 12),
        Flexible(
            child: Text(value,
                textAlign: TextAlign.right,
                style: const TextStyle(fontWeight: FontWeight.w600)))
      ]));
}

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});
  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
                color: ink, borderRadius: BorderRadius.circular(18)),
            child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("ABOUT PORTO'S",
                      style: TextStyle(
                          color: Color(0xffffb08f), letterSpacing: 1.5)),
                  SizedBox(height: 14),
                  Text('A little warmth,\nbaked into every day.',
                      style: TextStyle(color: Colors.white, fontSize: 30)),
                  SizedBox(height: 16),
                  Text(
                      'We make small-batch bread and pastries with patient hands, good ingredients, and plenty of care.',
                      style: TextStyle(color: Color(0xffd8e0d8))),
                ]),
          ),
        ],
      );
}
