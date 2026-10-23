import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/app_data_provider.dart';
import '../../models/app_models.dart';
import 'package:intl/intl.dart';
import 'create_sale_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/pdf_service.dart';

class CustomerDetailScreen extends ConsumerStatefulWidget {
  final String customerId;
  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  ConsumerState<CustomerDetailScreen> createState() =>
      _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends ConsumerState<CustomerDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final appDataAsync = ref.watch(appDataProvider);

    return appDataAsync.when(
      data: (data) {
        final customer = data.customers.firstWhere(
          (c) => c.id == widget.customerId,
        );
        final transactions = data.transactions
            .where((t) => t.customerId == widget.customerId)
            .toList();
        transactions.sort((a, b) => b.date.compareTo(a.date));

        final stats = _calculateStats(transactions);

        return Scaffold(
          backgroundColor: const Color(0xFFFAF8F3),
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  customer.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                Text(
                  customer.phone,
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
            backgroundColor: const Color(0xFFFAF8F3),
            actions: [
              IconButton(
                onPressed: () => _shareFullKhata(
                  customer,
                  transactions,
                  data.settings.billDesign,
                ),
                icon: const Icon(
                  Icons.picture_as_pdf,
                  color: Color(0xFF8C6A4F),
                ),
              ),
              IconButton(
                onPressed: () => _openWhatsApp(customer, stats.balance),
                icon: const Icon(Icons.chat, color: Colors.green),
              ),
            ],
          ),
          body: Column(
            children: [
              _buildStatsHeader(stats),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    const Text(
                      'TRANSACTION HISTORY',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 1,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Checkbox(value: true, onChanged: (v) {}),
                        const Text(
                          'Select All',
                          style: TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: transactions.isEmpty
                    ? const Center(
                        child: Text(
                          'No entries found.',
                          style: TextStyle(
                            color: Colors.grey,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.only(bottom: 80),
                        itemCount: transactions.length,
                        itemBuilder: (context, index) => _buildTransactionCard(
                          transactions[index],
                          customer,
                          data.settings.billDesign,
                        ),
                      ),
              ),
              _buildActionButtons(context, data, customer),
            ],
          ),
        );
      },
      loading: () {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      },
      error: (e, _) => Scaffold(body: Center(child: Text('Error: $e'))),
    );
  }

  Widget _buildStatsHeader(_CustStats stats) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCFCAC0)),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          const Text(
            'OUTSTANDING BALANCE',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            stats.balance.abs().toStringAsFixed(0),
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: stats.balance > 0
                  ? Colors.red.shade700
                  : Colors.green.shade700,
            ),
          ),
          Text(
            stats.balance >= 0 ? 'Customer owes you' : 'You owe customer',
            style: const TextStyle(fontSize: 10, color: Colors.grey),
          ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _statItem('Total Sales', stats.totalSales, Colors.black87),
              Container(width: 1, height: 30, color: Colors.grey.shade200),
              _statItem('Total Paid', stats.totalPaid, Colors.green.shade700),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statItem(String label, double val, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(
          val.toStringAsFixed(0),
          style: TextStyle(fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }

  Widget _buildTransactionCard(
    Transaction tx,
    Customer customer,
    BillDesignSettings settings,
  ) {
    bool isPayment =
        tx.type == 'debit' ||
        (tx.items == null && tx.amountPaid > 0 && tx.totalAmount == 0);
    final dateStr = DateFormat(
      'dd MMM yyyy, hh:mm a',
    ).format(DateTime.parse(tx.date));

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE5E2DA), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (tx.isEdited == true)
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Edited',
                  style: TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                    fontSize: 10,
                  ),
                ),
              ),
            // Header: Shop details
            if (settings.logo.isNotEmpty)
              ClipOval(
                child: Image.network(
                  settings.logo,
                  width: 50,
                  height: 50,
                  fit: BoxFit.cover,
                  errorBuilder: (c, e, s) => const Icon(Icons.store, size: 50),
                ),
              )
            else
              const Icon(Icons.store, size: 50, color: Colors.grey),
            const SizedBox(height: 8),
            Text(
              settings.shopName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (settings.address.isNotEmpty)
              Text(
                settings.address,
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            if (settings.contacts.isNotEmpty)
              Text(
                '${settings.contacts.first.label}: ${settings.contacts.first.phone}',
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            const SizedBox(height: 16),

            // Bill info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isPayment
                      ? 'Payment Receipt'
                      : 'Bill #: ${tx.billNumber ?? "-"}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text('Date: $dateStr', style: const TextStyle(fontSize: 12)),
              ],
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Customer: ${customer.name}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 16),

            // Items Table
            if (!isPayment && tx.items != null && tx.items!.isNotEmpty) ...[
              Row(
                children: const [
                  Expanded(
                    flex: 3,
                    child: Text(
                      'Item',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Text(
                      'Qty',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Text(
                      'Rate',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'Total',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ),
                ],
              ),
              const Divider(),
              ...tx.items!.map(
                (i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          i.itemName,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                      Expanded(
                        flex: 1,
                        child: Text(
                          '${i.quantity}',
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      Expanded(
                        flex: 1,
                        child: Text(
                          i.unitPrice.toStringAsFixed(0),
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          (i.quantity * i.unitPrice).toStringAsFixed(0),
                          style: const TextStyle(fontSize: 12),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(),
            ],

            // Totals
            if (!isPayment) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Bill Total:'),
                  Text(
                    tx.totalAmount.toStringAsFixed(0),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Previous Balance:',
                    style: TextStyle(fontSize: 12),
                  ),
                  Text(
                    (tx.previousBalance ?? 0).toStringAsFixed(0),
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Grand Total:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    (tx.grandTotal ??
                            ((tx.previousBalance ?? 0) + tx.totalAmount))
                        .toStringAsFixed(0),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],

            // Payments
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Payments',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    isPayment
                        ? 'Payment on $dateStr'
                        : 'Initial Payment on $dateStr',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.blueAccent,
                    ),
                  ),
                ),
                Text(
                  tx.amountPaid.toStringAsFixed(0),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.blueAccent,
                  ),
                ),
              ],
            ),
            if (tx.additionalPayments != null) ...[
              ...tx.additionalPayments!.map(
                (p) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Payment on ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(p.date))} ${p.notes != null ? '(${p.notes})' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.blueAccent,
                        ),
                      ),
                    ),
                    Text(
                      p.amount.toStringAsFixed(0),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blueAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Paid:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  _calculateTotalPaidIntx(tx).toStringAsFixed(0),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Remaining Balance:',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.red,
                  ),
                ),
                Text(
                  tx.remainingBalance.toStringAsFixed(0),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.red,
                  ),
                ),
              ],
            ),

            if (tx.notes != null && tx.notes!.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Notes:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  tx.notes!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black87,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),
            Text(
              settings.footer,
              style: const TextStyle(
                fontSize: 10,
                color: Colors.grey,
                fontStyle: FontStyle.italic,
              ),
            ),
            const SizedBox(height: 8),

            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  onPressed: () => _confirmDeleteTransaction(tx),
                  icon: const Icon(
                    Icons.delete_outline,
                    size: 20,
                    color: Colors.grey,
                  ),
                  tooltip: 'Delete Entry',
                ),
                TextButton.icon(
                  onPressed: () => _shareBillOnWhatsApp(customer, tx),
                  icon: const Icon(Icons.share, size: 16),
                  label: const Text('WhatsApp'),
                ),
                TextButton.icon(
                  onPressed: () =>
                      PdfService.generateAndShareBill(tx, customer, settings),
                  icon: const Icon(Icons.picture_as_pdf, size: 16),
                  label: const Text('PDF'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteTransaction(Transaction tx) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Entry?'),
        content: const Text(
          'This will remove the transaction and update stock/balances. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              ref.read(appDataProvider.notifier).deleteTransaction(tx);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('DELETE'),
          ),
        ],
      ),
    );
  }

  double _calculateTotalPaidIntx(Transaction tx) {
    double pay = tx.amountPaid;
    if (tx.additionalPayments != null) {
      for (var p in tx.additionalPayments!) {
        pay += p.amount;
      }
    }
    return pay;
  }

  Widget _buildActionButtons(
    BuildContext context,
    AppData data,
    Customer customer,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      CreateSaleScreen(customerId: customer.id),
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8C6A4F),
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'NEW SALE / BILL',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton(
              onPressed: () => _handlePaymentEntry(data, customer),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'ADD PAYMENT',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handlePaymentEntry(AppData data, Customer customer) {
    final amtCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Receive Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amtCtrl,
              decoration: const InputDecoration(
                labelText: 'Amount Received',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: noteCtrl,
              decoration: const InputDecoration(
                labelText: 'Notes (Optional)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () {
              final amt = double.tryParse(amtCtrl.text) ?? 0;
              if (amt > 0) {
                final txs = data.transactions
                    .where((t) => t.customerId == customer.id)
                    .toList();
                txs.sort((a, b) => b.date.compareTo(a.date));
                final openBillIdx = txs.indexWhere(
                  (t) => t.type == 'credit' && t.remainingBalance > 0,
                );

                if (openBillIdx != -1) {
                  ref
                      .read(appDataProvider.notifier)
                      .addBillPayment(
                        txs[openBillIdx].id,
                        amt,
                        notes: noteCtrl.text,
                      );
                } else {
                  final prevBal = txs.isNotEmpty
                      ? txs.first.remainingBalance
                      : 0;
                  ref
                      .read(appDataProvider.notifier)
                      .addTransaction(
                        Transaction(
                          id: DateTime.now().millisecondsSinceEpoch.toString(),
                          customerId: customer.id,
                          customerName: customer.name,
                          totalAmount: 0,
                          amountPaid: amt,
                          type: 'debit',
                          date: DateTime.now().toIso8601String(),
                          remainingBalance: prevBal - amt,
                          previousBalance: prevBal.toDouble(),
                          paid: (prevBal - amt) <= 0,
                          notes: noteCtrl.text,
                          status: 'closed',
                        ),
                      );
                }
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text('SAVE PAYMENT'),
          ),
        ],
      ),
    );
  }

  _CustStats _calculateStats(List<Transaction> txs) {
    double totalSales = 0;
    double totalPaid = 0;
    for (var tx in txs) {
      if (tx.type != 'debit' && tx.type != 'purchase') {
        totalSales += tx.totalAmount;
      }
      totalPaid += tx.amountPaid;
      if (tx.additionalPayments != null) {
        for (var p in tx.additionalPayments!) {
          totalPaid += p.amount;
        }
      }
      if (tx.type == 'debit') totalPaid += tx.totalAmount;
    }
    return _CustStats(
      totalSales: totalSales,
      totalPaid: totalPaid,
      balance: txs.isNotEmpty ? txs.first.remainingBalance : 0,
    );
  }

  void _openWhatsApp(Customer customer, double balance) async {
    final msg =
        "Assalam-o-Alaikum ${customer.name}, your current outstanding balance with ShopBook is Rs. ${balance.abs().toStringAsFixed(0)}. Please settle it at your earliest convenience. Thank you!";
    final url =
        "https://wa.me/${customer.phone}?text=${Uri.encodeComponent(msg)}";
    await launchUrl(Uri.parse(url));
  }

  void _shareBillOnWhatsApp(Customer customer, Transaction tx) async {
    final msg =
        "Bill Receipt for ${customer.name}\nDate: ${DateFormat('dd MMM').format(DateTime.parse(tx.date))}\nBill Amount: ${tx.totalAmount}\nAmount Paid: ${tx.amountPaid}\nRemaining: ${tx.remainingBalance}";
    final url =
        "https://wa.me/${customer.phone}?text=${Uri.encodeComponent(msg)}";
    await launchUrl(Uri.parse(url));
  }

  void _shareFullKhata(
    Customer customer,
    List<Transaction> txs,
    BillDesignSettings settings,
  ) {
    if (txs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No transactions to generate PDF')),
      );
      return;
    }
    PdfService.generateAndShareKhata(customer, txs, settings);
  }
}

class _CustStats {
  final double totalSales;
  final double totalPaid;
  final double balance;
  _CustStats({
    required this.totalSales,
    required this.totalPaid,
    required this.balance,
  });
}
