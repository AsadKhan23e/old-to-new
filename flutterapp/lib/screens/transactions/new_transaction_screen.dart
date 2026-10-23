import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/app_provider.dart';
import '../../models/app_models.dart';
import '../../services/translation_service.dart';

class NewTransactionScreen extends StatefulWidget {
  final String? customerId;
  const NewTransactionScreen({super.key, this.customerId});

  @override
  State<NewTransactionScreen> createState() => _NewTransactionScreenState();
}

class _NewTransactionScreenState extends State<NewTransactionScreen> {
  String? _selectedCustomerId;
  String _type = 'credit';
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  String _date = DateTime.now().toIso8601String().split('T')[0];

  @override
  void initState() {
    super.initState();
    _selectedCustomerId = widget.customerId;
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final customers = provider.appData?.customers ?? [];
    final lang = provider.appData?.settings.language ?? 'en';

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F3),
      appBar: AppBar(
        title: Text(
          TranslationService.t('addManualTransaction', lang),
          style: const TextStyle(
            fontFamily: 'serif',
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFCFCAC0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      TranslationService.t('selectCustomer', lang),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedCustomerId,
                      items: customers
                          .map(
                            (c) => DropdownMenuItem(
                              value: c.id,
                              child: Text(c.name),
                            ),
                          )
                          .toList(),
                      onChanged: (val) =>
                          setState(() => _selectedCustomerId = val),
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      TranslationService.t('transactionType', lang),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontFamily: 'serif',
                      ),
                    ),
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                          value: 'credit',
                          label: Text(
                            TranslationService.t('credit_long', lang),
                          ),
                        ),
                        ButtonSegment(
                          value: 'debit',
                          label: Text(TranslationService.t('debit_long', lang)),
                        ),
                      ],
                      selected: {_type},
                      onSelectionChanged: (val) =>
                          setState(() => _type = val.first),
                      style: ButtonStyle(
                        backgroundColor:
                            WidgetStateProperty.resolveWith<Color?>((states) {
                              if (states.contains(WidgetState.selected)) {
                                return const Color(0xFF8C6A4F);
                              }
                              return Colors.white;
                            }),
                        foregroundColor:
                            WidgetStateProperty.resolveWith<Color?>((states) {
                              if (states.contains(WidgetState.selected)) {
                                return Colors.white;
                              }
                              return const Color(0xFF2F2F2F);
                            }),
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _amountController,
                      decoration: InputDecoration(
                        labelText: TranslationService.t('amount', lang),
                        border: const OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: TextEditingController(text: _date),
                      decoration: InputDecoration(
                        labelText: TranslationService.t('date', lang),
                        border: const OutlineInputBorder(),
                      ),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now(),
                          firstDate: DateTime(2000),
                          lastDate: DateTime(2100),
                        );
                        if (picked != null) {
                          setState(
                            () =>
                                _date = picked.toIso8601String().split('T')[0],
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _notesController,
                      decoration: InputDecoration(
                        labelText: TranslationService.t('notesLabel', lang),
                        border: const OutlineInputBorder(),
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: () {
                        if (_selectedCustomerId != null &&
                            _amountController.text.isNotEmpty) {
                          final amount = double.parse(_amountController.text);
                          final customer = customers.firstWhere(
                            (c) => c.id == _selectedCustomerId,
                          );

                          // Check for open bill
                          final openBillIndex = provider.appData?.transactions
                              .indexWhere(
                                (tx) =>
                                    tx.customerId == customer.id &&
                                    tx.status == 'open',
                              );

                          if (_type == 'debit') {
                            if (openBillIndex == null || openBillIndex == -1) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Payments can ONLY be added inside an open bill. Please create a sale first.',
                                  ),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }

                            // Update existing open bill with this payment
                            final existingBill =
                                provider.appData!.transactions[openBillIndex];
                            final List<Payment> updatedPayments = [
                              ...(existingBill.additionalPayments ?? []),
                              Payment(
                                id: DateTime.now().millisecondsSinceEpoch
                                    .toString(),
                                amount: amount,
                                date: '${_date}T12:00:00Z',
                                notes: _notesController.text,
                              ),
                            ];

                            // Remaining Balance is derived later in UI, but we store it for consistency
                            final updatedBill = Transaction(
                              id: existingBill.id,
                              customerId: existingBill.customerId,
                              customerName: existingBill.customerName,
                              type: existingBill.type,
                              items: existingBill.items,
                              totalAmount: existingBill.totalAmount,
                              amountPaid: existingBill.amountPaid,
                              additionalPayments: updatedPayments,
                              date: existingBill.date,
                              previousBalance: existingBill.previousBalance,
                              grandTotal: existingBill.grandTotal,
                              remainingBalance:
                                  (existingBill.grandTotal ?? 0.0) -
                                  existingBill.amountPaid -
                                  updatedPayments.fold(
                                    0.0,
                                    (s, p) => s + p.amount,
                                  ),
                              notes: existingBill.notes,
                              paid: false,
                              status: 'open',
                              billNumber: existingBill.billNumber,
                              billAdjustments: existingBill.billAdjustments,
                            );
                            provider.updateTransaction(updatedBill);
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Payment added to open bill!'),
                              ),
                            );
                          } else {
                            // CREDIT (Udhar) manual entry
                            if (openBillIndex != null && openBillIndex != -1) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Customer already has an open bill. Please add items to it via the Sale screen.',
                                  ),
                                  backgroundColor: Colors.orange,
                                ),
                              );
                              return;
                            }

                            provider.addTransaction(
                              Transaction(
                                id: DateTime.now().millisecondsSinceEpoch
                                    .toString(),
                                customerId: _selectedCustomerId!,
                                customerName: customer.name,
                                totalAmount: amount,
                                amountPaid: 0,
                                remainingBalance: amount,
                                paid: false,
                                type: 'credit',
                                date: '${_date}T12:00:00Z',
                                notes: _notesController.text,
                                status: 'open',
                              ),
                            );
                            Navigator.pop(context);
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6B7A50),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        TranslationService.t('saveTransaction', lang),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
