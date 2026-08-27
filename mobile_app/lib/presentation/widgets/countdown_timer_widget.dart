import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_app/core/theme/app_theme.dart';

class CountdownTimerWidget extends StatefulWidget {
  final DateTime targetEndTime;
  final String label;
  final VoidCallback? onFinished;

  const CountdownTimerWidget({
    super.key,
    required this.targetEndTime,
    this.label = 'ENDS IN',
    this.onFinished,
  });

  @override
  State<CountdownTimerWidget> createState() => _CountdownTimerWidgetState();
}

class _CountdownTimerWidgetState extends State<CountdownTimerWidget> {
  Timer? _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateRemaining();
    });
  }

  void _updateRemaining() {
    final diff = widget.targetEndTime.difference(DateTime.now());
    if (diff.isNegative) {
      _timer?.cancel();
      _remaining = Duration.zero;
      if (mounted) {
        setState(() {});
        widget.onFinished?.call();
      }
    } else {
      if (mounted) {
        setState(() {
          _remaining = diff;
        });
      }
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _buildTimeBox(String value, String unit) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.background.withOpacity(0.8),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.accentFlash.withOpacity(0.5)),
          ),
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          unit,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final hours = _remaining.inHours.toString().padLeft(2, '0');
    final minutes = (_remaining.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_remaining.inSeconds % 60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.accentFlash.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accentFlash.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.bolt, color: AppColors.accentFlash, size: 20),
          const SizedBox(width: 6),
          Text(
            widget.label,
            style: const TextStyle(
              color: AppColors.accentFlash,
              fontWeight: FontWeight.bold,
              fontSize: 12,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(width: 12),
          _buildTimeBox(hours, 'HRS'),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(':', style: TextStyle(color: AppColors.accentFlash, fontWeight: FontWeight.bold)),
          ),
          _buildTimeBox(minutes, 'MIN'),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(':', style: TextStyle(color: AppColors.accentFlash, fontWeight: FontWeight.bold)),
          ),
          _buildTimeBox(seconds, 'SEC'),
        ],
      ),
    );
  }
}
