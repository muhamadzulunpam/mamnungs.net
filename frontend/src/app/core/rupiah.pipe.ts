import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'rupiah' })
export class RupiahPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return 'Rp' + new Intl.NumberFormat('id-ID').format(value ?? 0);
  }
}