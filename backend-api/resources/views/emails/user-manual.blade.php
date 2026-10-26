<x-mail::message>
@if ($language === 'ceb')
# Imong VMS User Manual

Maayong adlaw,

Salamat sa paggamit sa Barangay Vehicle Management System.

Gilakip niini nga email ang kompletong VMS User Manual sa imong gipiling pinulongan. Aduna kini mga lakang alang sa Administrator, Custodian, ug Maintenance Personnel.

Palihog tipigi kini nga giya aron imong mabalikan kon gikinahanglan.
@elseif ($language === 'fil')
# Ang Iyong VMS User Manual

Magandang araw,

Salamat sa paggamit ng Barangay Vehicle Management System.

Kalakip ng email na ito ang kumpletong VMS User Manual sa iyong napiling wika. Mayroon itong mga hakbang para sa Administrator, Custodian, at Maintenance Personnel.

Pakitago ang gabay na ito para magamit sa susunod.
@else
# Your VMS User Manual

Hello,

Thank you for using the Barangay Vehicle Management System.

Attached is your complete VMS User Manual in your selected language. The guide includes step-by-step instructions for Administrators, Custodians, and Maintenance Personnel.

Please keep this manual for future reference.
@endif

Barangay Vehicle Management System  
VMS Support
</x-mail::message>
