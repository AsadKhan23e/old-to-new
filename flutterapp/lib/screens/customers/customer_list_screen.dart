import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';
import 'customer_details_screen.dart';

class CustomerListScreen extends StatefulWidget {
  const CustomerListScreen({super.key});

  @override
  State<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends State<CustomerListScreen> {
  String _searchTerm = '';

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final customers =
        provider.appData?.customers.where((c) => !c.isSupplier).toList() ?? [];
    final lang = provider.appData?.settings.language ?? 'en';

    final sortedTxsMap = <String, DateTime>{};
    final balanceMap = <String, double>{};

    for (var c in customers) {
      final customerTxs =
          provider.appData?.transactions
              .where((t) => t.customerId == c.id)
              .toList() ??
          [];
      if (customerTxs.isNotEmpty) {
        double totalSales = 0;
        double totalPayments = 0;
        DateTime? latest;

        for (var tx in customerTxs) {
          final dt = DateTime.parse(tx.date);
          if (latest == null || dt.isAfter(latest)) latest = dt;

          if (tx.type != 'debit') {
            totalSales += tx.totalAmount;
            if (tx.billAdjustments != null) {
              for (var adj in tx.billAdjustments!) {
                totalSales += adj.difference;
              }
            }
          }

          totalPayments += tx.amountPaid;
          if (tx.additionalPayments != null) {
            for (var p in tx.additionalPayments!) {
              totalPayments += p.amount;
            }
          }
          if (tx.type == 'debit') {
            totalPayments += tx.totalAmount;
          }
        }
        sortedTxsMap[c.id] = latest!;
        balanceMap[c.id] = totalSales - totalPayments;
      }
    }

    final filteredCustomers = customers.where((c) {
      final nameMatch = c.name.toLowerCase().contains(
        _searchTerm.toLowerCase(),
      );
      final phoneMatch = c.phone.contains(_searchTerm);
      return nameMatch || phoneMatch;
    }).toList();

    filteredCustomers.sort((a, b) {
      final dateA = sortedTxsMap[a.id];
      final dateB = sortedTxsMap[b.id];
      if (dateA == null && dateB == null) return a.name.compareTo(b.name);
      if (dateA == null) return 1;
      if (dateB == null) return -1;
      return dateB.compareTo(dateA);
    });

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    onChanged: (val) => setState(() => _searchTerm = val),
                    decoration: InputDecoration(
                      hintText: TranslationService.t(
                        'searchCustomersPlaceholder',
                        lang,
                      ),
                      hintStyle: const TextStyle(
                        fontStyle: FontStyle.italic,
                        fontFamily: 'serif',
                      ),
                      prefixIcon: const Icon(
                        Icons.search,
                        color: Color(0xFF8C6A4F),
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      enabledBorder: OutlineInputBorder(
                        borderSide: const BorderSide(color: Color(0xFFCFCAC0)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderSide: const BorderSide(
                          color: Color(0xFF8C6A4F),
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: () =>
                      _showAddCustomerDialog(context, provider, lang),
                  icon: const Icon(Icons.person_add, size: 18),
                  label: const Text('Add'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8C6A4F),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 18,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filteredCustomers.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.person_off_outlined,
                          size: 64,
                          color: Color(0xFFCFCAC0),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          TranslationService.t('noCustomers', lang),
                          style: const TextStyle(
                            fontFamily: 'serif',
                            fontStyle: FontStyle.italic,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredCustomers.length,
                    itemBuilder: (context, index) {
                      final customer = filteredCustomers[index];
                      final balance = balanceMap[customer.id] ?? 0.0;

                      return Card(
                        color: Colors.white,
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFCFCAC0)),
                        ),
                        child: ListTile(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    CustomerDetailsScreen(customer: customer),
                              ),
                            );
                          },
                          leading: CircleAvatar(
                            backgroundColor: const Color(0xFFFAF8F3),
                            child: customer.picture != null
                                ? ClipOval(
                                    child: Image.network(
                                      customer.picture!,
                                      fit: BoxFit.cover,
                                      width: 40,
                                      height: 40,
                                    ),
                                  )
                                : const Icon(
                                    Icons.person,
                                    color: Color(0xFF8C6A4F),
                                  ),
                          ),
                          title: Text(
                            customer.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontFamily: 'serif',
                            ),
                          ),
                          subtitle: Text(
                            customer.phone,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'Balance',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[600],
                                ),
                              ),
                              Text(
                                balance.abs().toStringAsFixed(0),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: balance > 0
                                      ? Colors.red
                                      : balance < 0
                                      ? Colors.green
                                      : Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showAddCustomerDialog(
    BuildContext context,
    AppProvider provider,
    String lang,
  ) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final addressController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFFFAF8F3),
        title: Text(
          TranslationService.t('addNewCustomer', lang),
          style: const TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.bold,
          ),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: TranslationService.t('nameLabel', lang),
                ),
              ),
              TextField(
                controller: phoneController,
                decoration: InputDecoration(
                  labelText: TranslationService.t('phoneLabel', lang),
                ),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: addressController,
                decoration: InputDecoration(
                  labelText: TranslationService.t('addressLabel', lang),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(TranslationService.t('cancel', lang)),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isNotEmpty &&
                  phoneController.text.isNotEmpty) {
                provider.addCustomer(
                  Customer(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    name: nameController.text,
                    phone: phoneController.text,
                    address: addressController.text,
                    dateAdded: DateTime.now().toIso8601String(),
                  ),
                );
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8C6A4F),
              foregroundColor: Colors.white,
            ),
            child: Text(TranslationService.t('add', lang)),
          ),
        ],
      ),
    );
  }
}
