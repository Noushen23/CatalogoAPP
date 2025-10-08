declare module '@react-native-community/datetimepicker' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface DateTimePickerProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime';
    display?: 'default' | 'spinner' | 'calendar' | 'clock';
    onChange: (event: any, selectedDate?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
    style?: ViewStyle;
  }

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}


